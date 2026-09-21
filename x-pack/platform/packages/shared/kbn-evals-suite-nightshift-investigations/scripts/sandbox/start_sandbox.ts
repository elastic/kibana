/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes, X509Certificate } from 'crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { connect } from 'net';
import { join } from 'path';
import { setTimeout as sleep } from 'timers/promises';
import execa from 'execa';
import type { ToolingLog } from '@kbn/tooling-log';
import { renderSandboxEnv, type SandboxPorts } from './sandbox_env';

const REPOSITORY = 'https://github.com/elastic/sandbox-service.git';
const SANDBOX_IMAGE = 'kibana-nightshift-sandbox';
/** One network per running launcher, keyed by its unique gRPC port, so cleanup stays scoped. */
const getSandboxNetwork = ({ grpc }: SandboxPorts): string => `kibana-nightshift-sandbox-${grpc}`;
const CERTIFICATE_DAYS = 30;
const READY_TIMEOUT_MS = 60_000;

export interface StartSandboxOptions {
  log: ToolingLog;
  signal: AbortSignal;
  /** Holds the clone, binaries, certificates, workspaces and the connection env file. */
  dataDir: string;
  ports: SandboxPorts;
  /** Git ref of elastic/sandbox-service to build. */
  ref: string;
  /** Existing sandbox-service checkout to build as-is instead of cloning. */
  repoDir?: string;
  /** Rebuild the binaries and the sandbox image even when they already exist. */
  rebuild: boolean;
  /** Registers synchronous work to run while the CLI exits. */
  addCleanupTask: (task: () => void) => void;
}

const requireTools = async (tools: string[]): Promise<void> => {
  const missing: string[] = [];
  for (const tool of tools) {
    const { failed } = await execa('which', [tool], { reject: false });
    if (failed) missing.push(tool);
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required tools: ${missing.join(', ')}. The sandbox needs git, Go (the version in ` +
        `sandbox-service's .tool-versions), openssl, and a running Docker whose container IPs are ` +
        `reachable from the host (native on Linux; OrbStack on macOS).`
    );
  }
};

const ensureRepository = async (
  { log, dataDir, ref, repoDir }: StartSandboxOptions,
  env: NodeJS.ProcessEnv
): Promise<string> => {
  if (repoDir) {
    if (!existsSync(join(repoDir, 'cmd/sandbox-api'))) {
      throw new Error(`--repo-dir ${repoDir} is not a sandbox-service checkout.`);
    }
    return repoDir;
  }
  const clone = join(dataDir, 'sandbox-service');
  if (!existsSync(join(clone, '.git'))) {
    log.info(`Cloning ${REPOSITORY} (private; uses your git credentials)`);
    await execa('git', ['clone', '--quiet', REPOSITORY, clone], { env, stdio: 'inherit' });
  }
  await execa('git', ['fetch', '--quiet', 'origin', ref], { cwd: clone, env, stdio: 'inherit' });
  await execa('git', ['checkout', '--quiet', '--detach', 'FETCH_HEAD'], { cwd: clone, env });
  const { stdout: commit } = await execa('git', ['rev-parse', '--short', 'HEAD'], { cwd: clone });
  log.info(`Using sandbox-service ${ref} at ${commit}`);
  return clone;
};

const buildBinaries = async (
  { log, dataDir, rebuild }: StartSandboxOptions,
  repository: string
): Promise<string> => {
  const bin = join(dataDir, 'bin');
  mkdirSync(bin, { recursive: true });
  for (const [binary, source] of [
    ['container-manager-service', './cmd/container-manager'],
    ['sandbox-api', './cmd/sandbox-api'],
  ]) {
    if (rebuild || !existsSync(join(bin, binary))) {
      log.info(`Building ${binary}`);
      await execa('go', ['build', '-o', join(bin, binary), source], {
        cwd: repository,
        stdio: 'inherit',
      });
    }
  }
  return bin;
};

/**
 * Builds the sandbox image under a tag keyed by the source commit, and passes the immutable image
 * ID on, so a concurrent launcher building another ref cannot swap the image under this one.
 */
const ensureDockerResources = async (
  { log, rebuild, ports }: StartSandboxOptions,
  repository: string
): Promise<string> => {
  const { stdout: commit } = await execa('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: repository,
  });
  const tag = `${SANDBOX_IMAGE}:${commit}`;
  const existing = await execa('docker', ['image', 'inspect', tag, '--format', '{{.Id}}'], {
    reject: false,
  });
  if (rebuild || existing.failed) {
    log.info(`Building the ${tag} image`);
    await execa('docker', ['build', '-f', 'Dockerfile.sandbox', '-t', tag, '.'], {
      cwd: repository,
      stdio: 'inherit',
    });
  }
  const { stdout: imageId } = await execa('docker', [
    'image',
    'inspect',
    tag,
    '--format',
    '{{.Id}}',
  ]);
  const network = getSandboxNetwork(ports);
  const networkExists = await execa('docker', ['network', 'inspect', network], { reject: false });
  if (networkExists.failed) await execa('docker', ['network', 'create', network]);
  return imageId;
};

/**
 * Removes the per-conversation containers this launcher's container-manager left running, then
 * its network. Synchronous so it can run from a CLI cleanup task while the process is exiting.
 */
const removeSandboxContainers = (log: ToolingLog, network: string): void => {
  const { stdout } = execa.sync(
    'docker',
    ['ps', '--all', '--quiet', '--filter', `network=${network}`],
    { reject: false }
  );
  const containers = stdout.split('\n').filter(Boolean);
  if (containers.length > 0) {
    log.info(`Removing ${containers.length} sandbox container(s)`);
    execa.sync('docker', ['rm', '--force', ...containers], { reject: false });
  }
  execa.sync('docker', ['network', 'rm', network], { reject: false });
};

/** Creates a private CA-and-server certificate plus a client certificate for Kibana's mTLS. */
const ensureCertificates = async ({ log, dataDir }: StartSandboxOptions): Promise<string> => {
  const ssl = join(dataDir, 'ssl');
  mkdirSync(ssl, { recursive: true, mode: 0o700 });
  const client = join(ssl, 'client.crt');
  const tomorrow = Date.now() + 24 * 60 * 60_000;
  if (
    existsSync(join(ssl, 'server.key')) &&
    existsSync(client) &&
    new Date(new X509Certificate(readFileSync(client)).validTo).getTime() > tomorrow
  ) {
    return ssl;
  }
  log.info(`Generating mTLS certificates valid for ${CERTIFICATE_DAYS} days`);
  const days = String(CERTIFICATE_DAYS);
  const openssl = (args: string[]) => execa('openssl', args, { cwd: ssl });
  await openssl([
    ...['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', days],
    ...['-keyout', 'server.key', '-out', 'server.crt', '-subj', '/CN=localhost'],
    ...['-addext', 'subjectAltName=DNS:localhost'],
  ]);
  await openssl([
    ...['req', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'client.key', '-out', 'client.csr'],
    ...['-subj', '/CN=kibana-nightshift-evals'],
  ]);
  writeFileSync(join(ssl, 'client.ext'), 'extendedKeyUsage=clientAuth\n');
  await openssl([
    ...['x509', '-req', '-in', 'client.csr', '-CA', 'server.crt', '-CAkey', 'server.key'],
    ...['-CAcreateserial', '-out', 'client.crt', '-days', days, '-extfile', 'client.ext'],
  ]);
  for (const key of ['server.key', 'client.key']) chmodSync(join(ssl, key), 0o600);
  return ssl;
};

/** Reuses the key across restarts so an already-exported environment keeps working. */
const ensureApiKey = (dataDir: string): string => {
  const file = join(dataDir, 'api_key');
  if (!existsSync(file)) writeFileSync(file, randomBytes(32).toString('hex'), { mode: 0o600 });
  return readFileSync(file, 'utf8').trim();
};

const isListening = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => resolve(socket.destroy() !== undefined));
    socket.once('error', () => resolve(false));
  });

const waitUntil = async (
  description: string,
  check: () => Promise<boolean>,
  service: execa.ExecaChildProcess,
  signal: AbortSignal
): Promise<void> => {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  // Check the signal first: an abort must stop the launcher even once the service is ready.
  while (!signal.aborted && !(await check())) {
    if (service.exitCode !== null) throw new Error(`${description} exited before it was ready`);
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}`);
    await sleep(500);
  }
};

/**
 * Builds and runs elastic/sandbox-service natively with its Docker backend and mTLS, writes the
 * connection variables the eval Scout config reads, and stays in the foreground until aborted.
 */
export const startSandbox = async (options: StartSandboxOptions): Promise<void> => {
  const { log, signal, dataDir, ports } = options;
  await requireTools(['git', 'go', 'docker', 'openssl']);
  mkdirSync(dataDir, { recursive: true });
  // The directory holds the API key and private keys, so keep it owner-only even if it existed.
  chmodSync(dataDir, 0o700);
  for (const [name, port] of Object.entries(ports)) {
    if (await isListening(port)) throw new Error(`The ${name} port ${port} is already in use.`);
  }

  // Never let git prompt: a missing credential should fail with a clear message instead.
  const repository = await ensureRepository(options, { ...process.env, GIT_TERMINAL_PROMPT: '0' });
  const bin = await buildBinaries(options, repository);
  const imageId = await ensureDockerResources(options, repository);
  const ssl = await ensureCertificates(options);
  const apiKey = ensureApiKey(dataDir);
  const workspaces = join(dataDir, 'workspaces');
  mkdirSync(workspaces, { recursive: true });

  if (signal.aborted) return;

  const forward = (name: string, service: execa.ExecaChildProcess) => {
    for (const stream of [service.stdout, service.stderr]) {
      stream?.on('data', (chunk: Buffer) => {
        for (const line of chunk.toString().split('\n')) if (line) log.debug(`[${name}] ${line}`);
      });
    }
    // An abort during the clone or build has already fired; the listener alone would miss it.
    if (signal.aborted) service.kill('SIGTERM');
    else signal.addEventListener('abort', () => service.kill('SIGTERM'), { once: true });
    service.catch((error) => {
      if (!signal.aborted) log.error(`[${name}] exited: ${error.shortMessage ?? error.message}`);
    });
    return service;
  };

  // Only from here on can containers on this network belong to this invocation: the port check
  // above already failed for a second launcher on the same ports, before it could clean up.
  const network = getSandboxNetwork(ports);
  options.addCleanupTask(() => removeSandboxContainers(log, network));

  // With CLUSTER_NAME=localhost container-manager uses the host Docker socket and reads its
  // certificate from ./ssl, so it runs from the data directory.
  const manager = forward(
    'container-manager',
    execa(join(bin, 'container-manager-service'), [], {
      cwd: dataDir,
      env: {
        CLUSTER_NAME: 'localhost',
        WORKSPACE_PVC_PATH: workspaces,
        CONTAINERMANAGER_LISTEN_PORT: String(ports.manager),
        CONTAINERMANAGER_SANDBOX_IMAGE: imageId,
        CONTAINERMANAGER_DOCKER_SANDBOX_NETWORK: network,
      },
    })
  );
  await waitUntil('container-manager', () => isListening(ports.manager), manager, signal);
  if (signal.aborted) return;

  // The API key travels in the environment, never in arguments. Leaving WORKSPACE_SNAPSHOT_*
  // unset keeps every conversation independent.
  const api = forward(
    'sandbox-api',
    execa(join(bin, 'sandbox-api'), [], {
      cwd: dataDir,
      env: {
        SANDBOX_API_KEY: apiKey,
        SANDBOX_GRPC_ADDRESS: `:${ports.grpc}`,
        SANDBOX_API_ADDRESS: `:${ports.probe}`,
        CONTAINERMANAGER_ADDRESS: `localhost:${ports.manager}`,
        CONTAINERMANAGER_CA_CERT: join(ssl, 'server.crt'),
        SANDBOX_API_TLS_CERT: join(ssl, 'server.crt'),
        SANDBOX_API_TLS_KEY: join(ssl, 'server.key'),
        SANDBOX_API_CLIENT_CA_CERT: join(ssl, 'server.crt'),
      },
    })
  );
  const isReady = async () => {
    const response = await fetch(`http://127.0.0.1:${ports.probe}/ready`).catch(() => undefined);
    return response?.ok ?? false;
  };
  await waitUntil('sandbox-api', isReady, api, signal);
  if (signal.aborted) return;

  const envFile = join(dataDir, 'sandbox.env');
  writeFileSync(
    envFile,
    renderSandboxEnv({
      apiKey,
      grpcPort: ports.grpc,
      clientCertificatePath: join(ssl, 'client.crt'),
      clientKeyPath: join(ssl, 'client.key'),
      caCertificatePath: join(ssl, 'server.crt'),
    }),
    { mode: 0o600 }
  );
  chmodSync(envFile, 0o600);

  log.success(`Sandbox is ready: gRPC with mTLS on localhost:${ports.grpc}`);
  log.info(`In the terminal that runs the evals:\n\n  source ${envFile}\n`);
  log.info('Press Ctrl+C to stop the sandbox.');

  // Both services run until aborted, so either one exiting on its own makes the sandbox unusable.
  await Promise.race([manager, api].map((service) => service.catch(() => undefined)));
  if (!signal.aborted) {
    for (const service of [manager, api]) service.kill('SIGTERM');
    throw new Error('A sandbox service stopped unexpectedly; see its output above.');
  }
};
