/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import { AUTH_TYPE, parsePinnedHostKey, SUB_ACTION } from '@kbn/connector-schemas/ssh_host';
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
import type { RemoteExecResult, SshTarget } from './ssh_host_session';
import {
  downloadRemote,
  execRemote,
  isSshClientFailure,
  normalizeClientError,
  SshLocalFailure,
  uploadRemote,
} from './ssh_host_session';

const DEFAULT_SSH_PORT = 22;
const DEFAULT_DOWNLOAD_MAX_BYTES = 10 * 1024 * 1024;
const SSH_CLIENT_FAILURE_CODE = 255;

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

const rethrowLocalFailure = (error: unknown): void => {
  if (error instanceof SshLocalFailure) {
    throw error;
  }
};

export class SshHostConnector extends SubActionConnector<Config, Secrets> {
  private readonly allowLegacyAlgorithms: boolean;

  constructor(
    params: ServiceParams<Config, Secrets>,
    options: { allowLegacyAlgorithms?: boolean } = {}
  ) {
    super(params);
    this.allowLegacyAlgorithms = options.allowLegacyAlgorithms ?? false;

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

  public async exec(params: ExecParams): Promise<RemoteExecResult> {
    const target = this.prepare();
    try {
      return await execRemote(target, params.script);
    } catch (error) {
      rethrowLocalFailure(error);
      if (isSshClientFailure(error)) {
        return {
          stdout: '',
          stderr: normalizeClientError(error).message,
          code: SSH_CLIENT_FAILURE_CODE,
        };
      }
      throw error;
    }
  }

  public async downloadFile(
    params: DownloadFileParams
  ): Promise<{ content: string; encoding: 'base64' }> {
    const target = this.prepare();
    const maxBytes =
      params.maxBytes && params.maxBytes > 0 ? params.maxBytes : DEFAULT_DOWNLOAD_MAX_BYTES;
    try {
      const bytes = await downloadRemote(target, params.remotePath, maxBytes);
      return { content: bytes.toString('base64'), encoding: 'base64' };
    } catch (error) {
      rethrowLocalFailure(error);
      if (isSshClientFailure(error)) {
        throw normalizeClientError(error);
      }
      throw error;
    }
  }

  public async uploadFile(params: UploadFileParams): Promise<void> {
    const target = this.prepare();
    try {
      await uploadRemote(target, params.remotePath, Buffer.from(params.content, 'base64'));
    } catch (error) {
      rethrowLocalFailure(error);
      if (isSshClientFailure(error)) {
        throw normalizeClientError(error);
      }
      throw error;
    }
  }

  private prepare(): SshTarget {
    this.assertHostAllowed();
    this.assertCredentials();
    const hostKey = this.resolveHostKey();
    const { hostname, port } = parseHost(this.config.host);
    const { username, password, sshPrivateKey } = this.secrets;
    return {
      connectorId: this.connector.id,
      hostname,
      port,
      username,
      authType: this.config.authType,
      password: password ?? undefined,
      privateKey: sshPrivateKey ?? undefined,
      skipHostKeyVerification: this.config.skipHostKeyVerification,
      hostKey,
      allowLegacyAlgorithms: this.allowLegacyAlgorithms,
      logger: this.logger,
    };
  }

  private resolveHostKey(): string | undefined {
    const hostKey = parsePinnedHostKey(this.config.hostKey);
    if (this.config.skipHostKeyVerification) {
      if (this.config.authType === AUTH_TYPE.Password) {
        throw new Error('Password authentication requires a pinned host key');
      }
      return hostKey;
    }
    if (hostKey) {
      return hostKey;
    }
    if (this.config.hostKey?.trim()) {
      throw new Error('Host key must be an OpenSSH public key line or a base64 key');
    }
    throw new Error('A host key is required unless host key verification is skipped');
  }

  private assertCredentials(): void {
    const { authType } = this.config;
    if (authType === AUTH_TYPE.Password) {
      if (!this.secrets.password) {
        throw new Error('Password is required for password authentication');
      }
      return;
    }
    if (authType === AUTH_TYPE.PrivateKey) {
      if (!this.secrets.sshPrivateKey) {
        throw new Error('SSH private key is required for key-based authentication');
      }
      return;
    }
    throw new Error(`Unsupported authType: ${authType}`);
  }

  private assertHostAllowed(): void {
    const { hostname } = parseHost(this.config.host);
    this.configurationUtilities.ensureHostnameAllowed(hostname);

    // A leading '-' would be an option if this were passed to a local ssh argv.
    const { username } = this.secrets;
    if (username.startsWith('-') || /\s/.test(username)) {
      throw new Error('Invalid SSH username');
    }
    if (hostname.startsWith('-')) {
      throw new Error('Invalid SSH host');
    }
  }
}
