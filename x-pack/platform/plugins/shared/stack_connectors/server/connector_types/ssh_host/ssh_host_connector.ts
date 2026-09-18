/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { closeSync, mkdtempSync, openSync, readFileSync, rmSync, statSync, writeSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import { AUTH_TYPE, SUB_ACTION } from '@kbn/connector-schemas/ssh_host';
import type {
  Config,
  Secrets,
  ExecParams,
  DownloadFileParams,
  UploadFileParams,
} from '@kbn/connector-schemas/ssh_host';
import {
  ExecParamsSchema,
  DownloadFileParamsSchema,
  UploadFileParamsSchema,
} from '@kbn/connector-schemas/ssh_host';

const MAX_BUFFER_BYTES = 100 * 1024 * 1024;
const DEFAULT_SSH_PORT = 22;
const DEFAULT_DOWNLOAD_MAX_BYTES = 10 * 1024 * 1024;
const CONTROL_PERSIST = '10s';

interface CommandTarget {
  bin: string;
  prefixArgs: string[];
}

interface ResolvedCredentials {
  ssh: CommandTarget;
  scp: CommandTarget;
  authArgs: string[];
  env: NodeJS.ProcessEnv;
  cleanup: () => void;
}

interface ExecFileResult {
  stdout: string;
  stderr: string;
  code: number;
}

export const parseHost = (host: string): { hostname: string; port: number } => {
  if (host.startsWith('[')) {
    const close = host.indexOf(']');
    if (close === -1) {
      return { hostname: host, port: DEFAULT_SSH_PORT };
    }
    const hostname = host.slice(1, close);
    const rest = host.slice(close + 1);
    if (rest.startsWith(':')) {
      const port = parseInt(rest.slice(1), 10);
      if (port >= 1 && port <= 65535) {
        return { hostname, port };
      }
    }
    return { hostname, port: DEFAULT_SSH_PORT };
  }

  // Unbracketed IPv6 contains more than one colon — host only, port 22.
  if ((host.match(/:/g) ?? []).length > 1) {
    return { hostname: host, port: DEFAULT_SSH_PORT };
  }

  const lastColon = host.lastIndexOf(':');
  if (lastColon === -1) return { hostname: host, port: DEFAULT_SSH_PORT };
  const portStr = host.slice(lastColon + 1);
  const port = parseInt(portStr, 10);
  if (!portStr || isNaN(port) || port < 1 || port > 65535) {
    return { hostname: host, port: DEFAULT_SSH_PORT };
  }
  return { hostname: host.slice(0, lastColon), port };
};

const sshDestination = (username: string, hostname: string): string => `${username}@${hostname}`;

const scpDestination = (username: string, hostname: string, remotePath: string): string => {
  const host = hostname.includes(':') ? `[${hostname}]` : hostname;
  return `${username}@${host}:${remotePath}`;
};

const runExecFile = (
  bin: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<ExecFileResult> =>
  new Promise((resolve, reject) => {
    execFile(bin, args, { env, maxBuffer: MAX_BUFFER_BYTES }, (error, stdout, stderr) => {
      if (!error) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: 0 });
        return;
      }

      if (error.code === 'ENOENT') {
        reject(
          new Error(
            `${bin} is not installed on the Kibana host. The SSH Host connector requires ssh, scp, and (for password auth) sshpass.`
          )
        );
        return;
      }

      if (typeof error.code === 'number') {
        resolve({
          stdout: (error.stdout ?? stdout).toString().trim(),
          stderr: (error.stderr ?? stderr).toString().trim(),
          code: error.code,
        });
        return;
      }

      reject(error);
    });
  });

export class SshHostConnector extends SubActionConnector<Config, Secrets> {
  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.registerSubAction({ name: SUB_ACTION.Exec, method: 'exec', schema: ExecParamsSchema });
    this.registerSubAction({
      name: SUB_ACTION.DownloadFile,
      method: 'downloadFile',
      schema: DownloadFileParamsSchema,
    });
    this.registerSubAction({
      name: SUB_ACTION.UploadFile,
      method: 'uploadFile',
      schema: UploadFileParamsSchema,
    });
  }

  protected getResponseErrorMessage(error: Error & { response?: { data?: unknown } }): string {
    return (error.response?.data as { message?: string })?.message ?? error.message;
  }

  public async exec(params: ExecParams): Promise<{ stdout: string; stderr: string; code: number }> {
    this.assertHostAllowed();
    return this.execCommand(params);
  }

  public async downloadFile(
    params: DownloadFileParams
  ): Promise<{ content: string; encoding: 'base64' }> {
    this.assertHostAllowed();
    const { remotePath } = params;
    const maxBytes =
      params.maxBytes && params.maxBytes > 0 ? params.maxBytes : DEFAULT_DOWNLOAD_MAX_BYTES;
    const { hostname, port } = parseHost(this.config.host);
    const { username } = this.secrets;
    const tempDir = mkdtempSync(join(tmpdir(), 'ssh_host_download_'));
    const tempDownloadPath = join(tempDir, 'file');
    const { scp, authArgs, env, cleanup } = await this.resolveCredentials();

    const args = [
      ...scp.prefixArgs,
      ...this.getTransportArgs('-P', port, authArgs),
      scpDestination(username, hostname, remotePath),
      tempDownloadPath,
    ];

    try {
      const { stderr, code } = await runExecFile(scp.bin, args, env);
      if (code !== 0) {
        throw new Error(stderr || `scp exited with code ${code}`);
      }
      const { size } = statSync(tempDownloadPath);
      if (size > maxBytes) {
        throw new Error(
          `Remote file exceeds max-step-size (${size} bytes > ${maxBytes} bytes). Increase max-step-size on this step or download a smaller file.`
        );
      }
      return { content: readFileSync(tempDownloadPath).toString('base64'), encoding: 'base64' };
    } finally {
      cleanup();
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

  public async uploadFile(params: UploadFileParams): Promise<void> {
    this.assertHostAllowed();
    const { remotePath, content } = params;
    const { hostname, port } = parseHost(this.config.host);
    const { username } = this.secrets;
    const tempDir = mkdtempSync(join(tmpdir(), 'ssh_host_upload_'));
    const localPath = join(tempDir, 'payload');
    const { ssh, scp, authArgs, env, cleanup } = await this.resolveCredentials();

    const bytes = Buffer.from(content, 'base64');
    const fd = openSync(localPath, 'w', 0o600);
    writeSync(fd, bytes);
    closeSync(fd);

    const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));

    try {
      if (remoteDir) {
        const mkdir = await runExecFile(
          ssh.bin,
          [
            ...ssh.prefixArgs,
            ...this.getTransportArgs('-p', port, authArgs),
            sshDestination(username, hostname),
            `mkdir -p -- ${JSON.stringify(remoteDir)}`,
          ],
          env
        );
        if (mkdir.code !== 0) {
          throw new Error(`Failed to create remote directory ${remoteDir}: ${mkdir.stderr}`);
        }
      }

      const { stderr, code } = await runExecFile(
        scp.bin,
        [
          ...scp.prefixArgs,
          ...this.getTransportArgs('-P', port, authArgs),
          localPath,
          scpDestination(username, hostname, remotePath),
        ],
        env
      );
      if (code !== 0) {
        throw new Error(`Failed to upload file to ${remotePath}: ${stderr}`);
      }
    } finally {
      cleanup();
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

  // Resolves auth credentials once. The returned cleanup() must be called in a finally block.
  private async resolveCredentials(): Promise<ResolvedCredentials> {
    const { authType } = this.config;

    switch (authType) {
      case AUTH_TYPE.Password: {
        const { password } = this.secrets;

        if (!password) {
          throw new Error('Password is required for password authentication');
        }

        return {
          ssh: { bin: 'sshpass', prefixArgs: ['-e', 'ssh'] },
          scp: { bin: 'sshpass', prefixArgs: ['-e', 'scp'] },
          authArgs: ['-o', 'PasswordAuthentication=yes'],
          env: { ...process.env, SSHPASS: password },
          cleanup: () => {},
        };
      }
      case AUTH_TYPE.PrivateKey: {
        const { sshPrivateKey } = this.secrets;

        if (!sshPrivateKey) {
          throw new Error('SSH private key is required for key-based authentication');
        }

        const tempDir = mkdtempSync(join(tmpdir(), 'ssh_host_key_'));
        const tempKeyPath = join(tempDir, 'id');
        // Strip \r so CRLF-pasted keys don't corrupt OpenSSH parsing; ensure trailing newline.
        const keyContent = `${sshPrivateKey.replace(/\r/g, '').trimEnd()}\n`;
        // Write with restricted permissions (writeFileSync is ESLint-restricted)
        const fd = openSync(tempKeyPath, 'w', 0o600);
        writeSync(fd, keyContent);
        closeSync(fd);

        return {
          ssh: { bin: 'ssh', prefixArgs: [] },
          scp: { bin: 'scp', prefixArgs: [] },
          authArgs: ['-i', tempKeyPath, '-o', 'PasswordAuthentication=no'],
          env: process.env,
          cleanup: () => {
            rmSync(tempDir, { recursive: true, force: true });
          },
        };
      }
      default:
        throw new Error(`Unsupported authType: ${authType}`);
    }
  }

  private async execCommand(
    params: ExecParams
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    const { script } = params;
    const { hostname, port } = parseHost(this.config.host);
    const { username } = this.secrets;

    // One argv to ssh. The remote shell decodes the payload and runs it with bash.
    const encodedScript = Buffer.from(script).toString('base64');
    const remoteCmd = `printf '%s' '${encodedScript}' | openssl base64 -d -A | bash`;

    const { ssh, authArgs, env, cleanup } = await this.resolveCredentials();
    const args = [
      ...ssh.prefixArgs,
      ...this.getTransportArgs('-p', port, authArgs),
      sshDestination(username, hostname),
      remoteCmd,
    ];

    try {
      return await runExecFile(ssh.bin, args, env);
    } finally {
      cleanup();
    }
  }

  private getTransportArgs(portFlag: '-p' | '-P', port: number, authArgs: string[]): string[] {
    return [
      ...authArgs,
      ...this.getHostKeyArgs(),
      '-o',
      'ConnectTimeout=10',
      '-o',
      'ControlMaster=auto',
      '-o',
      `ControlPath=${this.getControlPath()}`,
      '-o',
      `ControlPersist=${CONTROL_PERSIST}`,
      portFlag,
      String(port),
    ];
  }

  private assertHostAllowed(): void {
    const { hostname } = parseHost(this.config.host);
    this.configurationUtilities.ensureHostnameAllowed(hostname);
  }

  private getHostKeyArgs(): string[] {
    if (this.config.skipHostKeyVerification) {
      return ['-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null'];
    }

    return [
      '-o',
      'StrictHostKeyChecking=accept-new',
      '-o',
      `UserKnownHostsFile=${this.getKnownHostsPath()}`,
    ];
  }

  private getKnownHostsPath(): string {
    const id = createHash('sha256').update(this.connector.id).digest('hex').slice(0, 16);
    return join(tmpdir(), `kbn_ssh_kh_${id}`);
  }

  private getControlPath(): string {
    const { hostname, port } = parseHost(this.config.host);
    const { username } = this.secrets;
    const id = createHash('sha256')
      .update(`${this.connector.id}\0${username}\0${hostname}\0${port}`)
      .digest('hex')
      .slice(0, 12);
    // OpenSSH ControlPath is capped around 104 chars; keep this under /tmp.
    return join('/tmp', `kbn_cm_${id}`);
  }
}
