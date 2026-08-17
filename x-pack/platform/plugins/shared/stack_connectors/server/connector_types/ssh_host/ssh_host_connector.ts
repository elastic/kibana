/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exec } from 'child_process';
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import { AUTH_TYPE } from '@kbn/connector-schemas/ssh_host';
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

const execPromise = promisify(exec);

const DEFAULT_SSH_PORT = 22;

interface ResolvedCredentials {
  sshPrefix: string;
  scpPrefix: string;
  authOpts: string[];
  env: NodeJS.ProcessEnv;
  cleanup: () => void;
}

const parseHost = (host: string): { hostname: string; port: number } => {
  const lastColon = host.lastIndexOf(':');
  if (lastColon === -1) return { hostname: host, port: DEFAULT_SSH_PORT };
  const portStr = host.slice(lastColon + 1);
  const port = parseInt(portStr, 10);
  if (!portStr || isNaN(port) || port < 1 || port > 65535) {
    return { hostname: host, port: DEFAULT_SSH_PORT };
  }
  return { hostname: host.slice(0, lastColon), port };
};

export class SshHostConnector extends SubActionConnector<Config, Secrets> {
  constructor(params: ServiceParams<Config, Secrets>) {
    super(params);

    this.registerSubAction({ name: 'exec', method: 'exec', schema: ExecParamsSchema });
    this.registerSubAction({
      name: 'downloadFile',
      method: 'downloadFile',
      schema: DownloadFileParamsSchema,
    });
    this.registerSubAction({
      name: 'uploadFile',
      method: 'uploadFile',
      schema: UploadFileParamsSchema,
    });
  }

  protected getResponseErrorMessage(error: Error & { response?: { data?: unknown } }): string {
    return (error.response?.data as { message?: string })?.message ?? error.message;
  }

  public async exec(params: ExecParams): Promise<{ stdout: string; stderr: string; code: number }> {
    return this.execCommand(params);
  }

  public async downloadFile(
    params: DownloadFileParams
  ): Promise<{ content: string; encoding: 'base64' }> {
    const { remotePath } = params;
    const { hostname, port } = parseHost(this.config.host);
    const { username } = this.secrets;
    const tempDownloadPath = join(tmpdir(), `ssh_host_download_${Date.now()}`);
    const { scpPrefix, authOpts, env, cleanup } = await this.resolveCredentials();

    const scpOpts = [
      ...authOpts,
      '-o StrictHostKeyChecking=no',
      '-o UserKnownHostsFile=/dev/null',
      '-o ConnectTimeout=10',
      '-o ControlMaster=auto',
      `-o ControlPath="${this.getControlPath()}"`,
      '-o ControlPersist=10s',
      `-P ${port}`,
    ];

    const scpTarget = `${username}@${hostname}:"${remotePath}" "${tempDownloadPath}"`;
    const scpCommand = `${scpPrefix} ${scpOpts.join(' ')} ${scpTarget}`;

    try {
      await execPromise(scpCommand, { env });
      return { content: readFileSync(tempDownloadPath).toString('base64'), encoding: 'base64' };
    } finally {
      cleanup();
      if (existsSync(tempDownloadPath)) unlinkSync(tempDownloadPath);
    }
  }

  public async uploadFile(params: UploadFileParams): Promise<void> {
    const { remotePath, content } = params;
    const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
    const mkdirPart = remoteDir ? `mkdir -p "${remoteDir}" && ` : '';
    const { code, stderr } = await this.execCommand({
      script: `${mkdirPart}printf '%s' '${content}' | openssl base64 -d -A > "${remotePath}"`,
    });
    if (code !== 0) {
      throw new Error(`Failed to upload file to ${remotePath}: ${stderr}`);
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
          sshPrefix: 'sshpass -e ssh',
          scpPrefix: 'sshpass -e scp',
          authOpts: ['-o PasswordAuthentication=yes'],
          env: { ...process.env, SSHPASS: password },
          cleanup: () => {},
        };
      }
      case AUTH_TYPE.PrivateKey: {
        const { sshPrivateKey } = this.secrets;

        if (!sshPrivateKey) {
          throw new Error('SSH private key is required for key-based authentication');
        }

        const tempKeyPath = join(
          tmpdir(),
          `ssh_host_key_${Date.now()}_${Math.random().toString(36).slice(2)}`
        );
        // Strip \r so CRLF-pasted keys don't corrupt OpenSSH parsing; ensure trailing newline.
        const keyContent = `${sshPrivateKey.replace(/\r/g, '').trimEnd()}\n`;
        // Write with restricted permissions (writeFileSync is ESLint-restricted)
        const fd = openSync(tempKeyPath, 'w', 0o600);
        writeSync(fd, keyContent);
        closeSync(fd);

        return {
          sshPrefix: 'ssh',
          scpPrefix: 'scp',
          authOpts: [`-i "${tempKeyPath}"`, '-o PasswordAuthentication=no'],
          env: process.env,
          cleanup: () => {
            if (existsSync(tempKeyPath)) unlinkSync(tempKeyPath);
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

    // Base64-encode the script so bash variables ($PID, $STATE, etc.) are not expanded
    // by the local shell when it processes the double-quoted SSH argument.
    const encodedScript = Buffer.from(script).toString('base64');
    const remoteCmd = `printf '%s' '${encodedScript}' | openssl base64 -d -A | bash`;

    const { sshPrefix, authOpts, env, cleanup } = await this.resolveCredentials();

    const sshOpts = [
      ...authOpts,
      '-o StrictHostKeyChecking=no',
      '-o UserKnownHostsFile=/dev/null',
      '-o ConnectTimeout=10',
      '-o ControlMaster=auto',
      `-o ControlPath="${this.getControlPath()}"`,
      '-o ControlPersist=10s',
      `-p ${port}`,
    ];

    const command = `${sshPrefix} ${sshOpts.join(' ')} ${username}@${hostname} "${remoteCmd}"`;

    try {
      const { stdout, stderr } = await execPromise(command, {
        env,
        maxBuffer: 100 * 1024 * 1024,
      });
      return {
        stdout: stdout.replace(command, '').trim(),
        stderr: stderr.replace(command, '').trim(),
        code: 0,
      };
    } catch (error) {
      const isChildProcessError =
        error instanceof Error && 'stdout' in error && 'stderr' in error && 'code' in error;
      if (
        isChildProcessError &&
        typeof error.stdout === 'string' &&
        typeof error.stderr === 'string' &&
        typeof error.code === 'number'
      ) {
        return {
          stdout: error.stdout.replace(command, '').trim(),
          stderr: error.stderr.replace(command, '').trim(),
          code: error.code,
        };
      }
      throw error;
    } finally {
      cleanup();
    }
  }

  private getControlPath(): string {
    const { hostname, port } = parseHost(this.config.host);
    const { username } = this.secrets;
    const safeId = `${username}_${hostname}_${port}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(tmpdir(), `kbn_cm_${safeId}`);
  }
}
