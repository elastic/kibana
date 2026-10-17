/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';

export interface DockerResult {
  exitCode: number;
  stdout: Buffer;
  stderr: Buffer;
}

export interface DockerRunOptions {
  input?: Buffer | string;
  /** Extra environment for the docker CLI process (used to pass `-e KEY` values). */
  env?: Record<string, string>;
  signal?: AbortSignal;
  maxBuffer?: number;
}

const DEFAULT_MAX_BUFFER = 64 * 1024 * 1024;

/** Thin wrapper around the docker CLI that never throws on a non-zero exit code. */
export class DockerCli {
  private constructor(private readonly dockerPath: string) {}

  /** Resolves the docker binary once, so a per-command PATH override cannot hide it. */
  static async create(): Promise<DockerCli> {
    const { stdout } = await execa('sh', ['-c', 'command -v docker'], { reject: false });
    const dockerPath = stdout.trim();
    if (!dockerPath) {
      throw new Error('docker CLI not found on PATH');
    }
    const docker = new DockerCli(dockerPath);
    const info = await docker.run(['info', '--format', '{{.ServerVersion}}']);
    if (info.exitCode !== 0) {
      throw new Error(`Docker is not running: ${info.stderr.toString().trim()}`);
    }
    return docker;
  }

  async run(args: string[], options: DockerRunOptions = {}): Promise<DockerResult> {
    const { input, env, signal, maxBuffer = DEFAULT_MAX_BUFFER } = options;
    const subprocess = execa(this.dockerPath, args, {
      reject: false,
      encoding: null,
      input,
      env,
      maxBuffer,
    });
    const onAbort = () => subprocess.kill('SIGKILL');
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const result = await subprocess;
      return {
        exitCode: result.exitCode ?? 1,
        stdout: Buffer.from(result.stdout ?? ''),
        stderr: Buffer.from(result.stderr ?? ''),
      };
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }
  }

  /** Synchronous variant for process-exit cleanup hooks, which cannot await. */
  runSync(args: string[]): DockerResult {
    const result = execa.sync(this.dockerPath, args, { reject: false, encoding: null });
    return {
      exitCode: result.exitCode ?? 1,
      stdout: Buffer.from(result.stdout ?? ''),
      stderr: Buffer.from(result.stderr ?? ''),
    };
  }

  /** Runs a command with inherited stdio, for long user-visible operations like image builds. */
  async runInteractive(args: string[], input?: string): Promise<number> {
    const result = await execa(this.dockerPath, args, {
      reject: false,
      input,
      stdout: 'inherit',
      stderr: 'inherit',
    });
    return result.exitCode ?? 1;
  }
}
