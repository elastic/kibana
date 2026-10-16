/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type {
  FileMetadata,
  ReadFileRequest,
  ReadFileResult,
  RunCommandRequest,
  RunCommandResult,
  WriteFileRequest,
  WriteFileResult,
} from '@kbn/sandbox-proto';
import type { DockerCli, DockerResult, DockerRunOptions } from './docker_cli';
import type { SandboxBackend } from './sandbox_api_server';
import { SandboxUnavailableError } from './errors';
import { DEFAULT_DIRECTORY, resolveSandboxPath } from './sandbox_paths';

export const CONTAINER_LABEL = 'kbn-mock-sandbox';
const CONTAINER_NAME_PREFIX = 'kbn-mock-sandbox-';

// Mirrors cmd/sandbox-service/main.go: the pod enforces at least 600s per command, and caps
// stdout and stderr at 1.5 MiB each so a response fits the 4 MiB gRPC message limit.
const MIN_COMMAND_TIMEOUT_SECONDS = 600;
const MAX_COMMAND_OUTPUT_BYTES = 3 * 512 * 1024;
const TIMEOUT_EXIT_CODE = 124;
const FILE_OP_CONCURRENCY = 8;

// Mirrors cmd/sandbox-service/env_filter.go (isSafeReqEnvKey).
const CODE_EXECUTING_ENV_KEYS = new Set([
  'BASH_ENV',
  'ENV',
  'SHELLOPTS',
  'PS1',
  'PS2',
  'PS3',
  'PS4',
  'PROMPT_COMMAND',
  'LD_PRELOAD',
  'LD_LIBRARY_PATH',
  'LD_AUDIT',
  'GCONV_PATH',
  'PYTHONPATH',
  'PYTHONSTARTUP',
  'NODE_PATH',
  'NODE_OPTIONS',
  'PERL5OPT',
  'PERL5LIB',
  'RUBYOPT',
  'RUBYLIB',
  'JAVA_TOOL_OPTIONS',
  '_JAVA_OPTIONS',
  'JDK_JAVA_OPTIONS',
  'CLASSPATH',
  'IFS',
]);
const isSafeRequestEnvKey = (key: string): boolean =>
  !CODE_EXECUTING_ENV_KEYS.has(key) && /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);

// Env keys that change how the docker CLI itself behaves; these are passed inline (`-e K=V`)
// instead of through the CLI's own environment.
const isDockerClientEnvKey = (key: string): boolean =>
  key === 'PATH' || key === 'HOME' || key.startsWith('DOCKER_') || key.startsWith('XDG_');

// What `docker exec` prints when the container was removed or stopped.
const CONTAINER_GONE_PATTERN =
  /^Error response from daemon: (No such container|[Cc]ontainer [0-9a-f]+ is not running)/;

const truncationNotice = (dropped: number, total: number): string =>
  `\n[sandbox: output truncated, ${dropped} of ${total} bytes dropped. Command stdout and stderr ` +
  `are each limited to ${MAX_COMMAND_OUTPUT_BYTES} bytes so the response fits the 4 MiB gRPC ` +
  `message limit. Redirect large output to a file\n`;

const capOutput = (output: Buffer): string => {
  if (output.length <= MAX_COMMAND_OUTPUT_BYTES) {
    return output.toString('utf8');
  }
  const kept = output
    .subarray(0, MAX_COMMAND_OUTPUT_BYTES)
    .toString('utf8')
    .replace(/\uFFFD$/, '');
  return kept + truncationNotice(output.length - MAX_COMMAND_OUTPUT_BYTES, output.length);
};

const mapWithConcurrency = async <T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
};

/** Resolves request paths, keeping the original index so results stay index-aligned. */
const resolvePaths = (paths: readonly string[]) =>
  paths.flatMap((path, index) => {
    const resolved = resolveSandboxPath(path);
    return resolved ? [{ index, resolved }] : [];
  });

export interface DockerSandboxBackendOptions {
  docker: DockerCli;
  image: string;
  log: ToolingLog;
}

/**
 * Runs each conversation in its own long-lived Docker container and implements the sandbox
 * RPCs with `docker exec`. A container that disappears (e.g. `docker rm -f`) surfaces as
 * UNAVAILABLE once, like an evicted pod, and is recreated on the next call.
 */
export class DockerSandboxBackend implements SandboxBackend {
  private readonly containers = new Map<string, Promise<string>>();
  private readonly docker: DockerCli;
  private readonly image: string;
  private readonly log: ToolingLog;

  constructor({ docker, image, log }: DockerSandboxBackendOptions) {
    this.docker = docker;
    this.image = image;
    this.log = log;
  }

  async runCommand(
    conversationId: string,
    request: RunCommandRequest,
    signal: AbortSignal
  ): Promise<RunCommandResult> {
    const timeoutSeconds = Math.max(MIN_COMMAND_TIMEOUT_SECONDS, request.timeout_seconds);
    const directory = request.directory || DEFAULT_DIRECTORY;

    const envArgs: string[] = [];
    const cliEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(request.env)) {
      if (!isSafeRequestEnvKey(key)) continue;
      if (isDockerClientEnvKey(key)) {
        envArgs.push('-e', `${key}=${value}`);
      } else {
        // `-e KEY` without a value makes docker read it from its own environment, which keeps
        // connector secrets out of the host process list.
        envArgs.push('-e', key);
        cliEnv[key] = value;
      }
    }

    const startedAt = Date.now();
    const result = await this.exec(
      conversationId,
      ['-w', directory, ...envArgs],
      [
        'timeout',
        '-k',
        '5',
        String(timeoutSeconds),
        'bash',
        '--noprofile',
        '--norc',
        '-c',
        request.command,
      ],
      { env: cliEnv, signal }
    );
    const timedOut =
      result.exitCode === TIMEOUT_EXIT_CODE && Date.now() - startedAt >= timeoutSeconds * 1000;

    return {
      stdout: capOutput(result.stdout),
      stderr: capOutput(result.stderr),
      exit_code: result.exitCode,
      timed_out: timedOut,
    };
  }

  async statFiles(conversationId: string, paths: string[]): Promise<FileMetadata[]> {
    const results: FileMetadata[] = paths.map((path) => ({
      path,
      size: 0,
      is_dir: false,
      exists: false,
      modified_time_sec: 0,
    }));
    const valid = resolvePaths(paths);
    const script =
      'for p in "$@"; do if s=$(stat -L -c "%s %Y %F" -- "$p" 2>/dev/null); then ' +
      'printf "%s\\n" "$s"; else printf -- "-\\n"; fi; done';
    const result = await this.exec(
      conversationId,
      [],
      ['bash', '-c', script, '_', ...valid.map(({ resolved }) => resolved)]
    );
    const lines = result.stdout.toString('utf8').split('\n');
    valid.forEach(({ index }, position) => {
      const match = /^(\d+) (\d+) (.+)$/.exec(lines[position] ?? '');
      if (!match) return;
      results[index] = {
        path: paths[index],
        size: Number(match[1]),
        modified_time_sec: Number(match[2]),
        is_dir: match[3] === 'directory',
        exists: true,
      };
    });
    return results;
  }

  async readFiles(conversationId: string, requests: ReadFileRequest[]): Promise<ReadFileResult[]> {
    await this.ensureContainer(conversationId);
    return mapWithConcurrency(requests, FILE_OP_CONCURRENCY, async ({ path, maxReadBytes }) => {
      const failure: ReadFileResult = { path, content: Buffer.alloc(0), success: false };
      const resolved = resolveSandboxPath(path);
      if (!resolved) return failure;
      const command =
        maxReadBytes && maxReadBytes > 0
          ? ['head', '-c', String(maxReadBytes), '--', resolved]
          : ['cat', '--', resolved];
      const result = await this.exec(conversationId, [], command);
      return result.exitCode === 0 ? { path, content: result.stdout, success: true } : failure;
    });
  }

  async writeFiles(
    conversationId: string,
    requests: WriteFileRequest[]
  ): Promise<WriteFileResult[]> {
    await this.ensureContainer(conversationId);
    const script = 'mkdir -p -- "$(dirname -- "$1")" && (umask 077 && cat > "$1")';
    return mapWithConcurrency(requests, FILE_OP_CONCURRENCY, async ({ path, content }) => {
      const resolved = resolveSandboxPath(path);
      if (!resolved) return { bytes_written: 0, success: false };
      const result = await this.exec(
        conversationId,
        ['-i'],
        ['bash', '-c', script, '_', resolved],
        {
          input: content,
        }
      );
      return result.exitCode === 0
        ? { bytes_written: content.length, success: true }
        : { bytes_written: 0, success: false };
    });
  }

  async mkdirs(conversationId: string, paths: string[]): Promise<boolean[]> {
    const results = paths.map(() => false);
    const valid = resolvePaths(paths);
    const script =
      'for p in "$@"; do if mkdir -p -- "$p" 2>/dev/null; then printf 1; else printf 0; fi; done';
    const result = await this.exec(
      conversationId,
      [],
      ['bash', '-c', script, '_', ...valid.map(({ resolved }) => resolved)]
    );
    const flags = result.stdout.toString('utf8');
    valid.forEach(({ index }, position) => {
      results[index] = flags[position] === '1';
    });
    return results;
  }

  /** Removes every mock sandbox container, including ones left over from earlier runs. */
  removeAllContainersSync(): number {
    const list = this.docker.runSync(['ps', '-aq', '--filter', `label=${CONTAINER_LABEL}=true`]);
    const ids = list.stdout.toString().split('\n').filter(Boolean);
    if (ids.length > 0) {
      this.docker.runSync(['rm', '-f', ...ids]);
    }
    this.containers.clear();
    return ids.length;
  }

  private async exec(
    conversationId: string,
    execOptions: string[],
    command: string[],
    runOptions: DockerRunOptions = {}
  ): Promise<DockerResult> {
    const containerName = await this.ensureContainer(conversationId);
    const result = await this.docker.run(
      ['exec', ...execOptions, containerName, ...command],
      runOptions
    );
    if (result.exitCode !== 0 && CONTAINER_GONE_PATTERN.test(result.stderr.toString())) {
      this.containers.delete(conversationId);
      this.log.warning(
        `[${conversationId}] container ${containerName} is gone; reporting UNAVAILABLE, the next call recreates it`
      );
      throw new SandboxUnavailableError(`sandbox for ${conversationId} is no longer running`);
    }
    return result;
  }

  private ensureContainer(conversationId: string): Promise<string> {
    let container = this.containers.get(conversationId);
    if (!container) {
      container = this.startContainer(conversationId);
      this.containers.set(conversationId, container);
      container.catch(() => this.containers.delete(conversationId));
    }
    return container;
  }

  private async startContainer(conversationId: string): Promise<string> {
    const name = `${CONTAINER_NAME_PREFIX}${conversationId}`;
    const inspect = await this.docker.run(['inspect', '-f', '{{.State.Running}}', name]);
    if (inspect.exitCode === 0) {
      if (inspect.stdout.toString().trim() === 'true') {
        this.log.info(`[${conversationId}] reusing running container ${name}`);
        return name;
      }
      await this.docker.run(['rm', '-f', name]);
    }

    const run = await this.docker.run([
      'run',
      '-d',
      '--init',
      '--name',
      name,
      '--label',
      `${CONTAINER_LABEL}=true`,
      '--label',
      `${CONTAINER_LABEL}.conversation=${conversationId}`,
      '--add-host',
      'host.docker.internal:host-gateway',
      '--entrypoint',
      'sleep',
      this.image,
      'infinity',
    ]);
    if (run.exitCode !== 0) {
      throw new Error(`docker run failed for ${name}: ${run.stderr.toString().trim()}`);
    }
    this.log.info(`[${conversationId}] started container ${name}`);
    return name;
  }
}
