/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, timingSafeEqual } from 'crypto';
import { Client, utils } from 'ssh2';
import type { ConnectConfig, SFTPWrapper } from 'ssh2';
import { AUTH_TYPE } from '@kbn/connector-schemas/ssh_host';
import type { AuthType } from '@kbn/connector-schemas/ssh_host';

const MAX_BUFFER_BYTES = 100 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;
const CONNECT_TIMEOUT_MS = 10 * 1000;
const KEEPALIVE_INTERVAL_MS = 15 * 1000;
const KEEPALIVE_COUNT_MAX = 3;
/** Matches the previous OpenSSH ControlPersist window. */
export const SSH_SESSION_IDLE_MS = 10 * 1000;
const SSH_CLIENT_FAILURE_CODE = 255;
const SFTP_NO_SUCH_FILE = utils.sftp.STATUS_CODE.NO_SUCH_FILE;

export type SshLocalFailureKind = 'timeout' | 'output-limit';

export class SshLocalFailure extends Error {
  public readonly kind: SshLocalFailureKind;

  constructor(kind: SshLocalFailureKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'SshLocalFailure';
  }
}

export interface SshTarget {
  connectorId: string;
  hostname: string;
  port: number;
  username: string;
  authType: AuthType;
  password?: string;
  privateKey?: string;
  skipHostKeyVerification: boolean;
  /** Canonical base64 host-key blob. Present when verification is pinned. */
  hostKey?: string;
  allowLegacyAlgorithms: boolean;
  logger?: { info: (message: string) => void };
}

/**
 * ssh2 1.17 defaults with SHA-1 host keys, MACs, and key exchange removed.
 * Cipher order stays with ssh2 so it can follow the runtime's AES support.
 */
export const MODERN_SSH_ALGORITHMS: NonNullable<ConnectConfig['algorithms']> = {
  kex: [
    'curve25519-sha256',
    'curve25519-sha256@libssh.org',
    'ecdh-sha2-nistp256',
    'ecdh-sha2-nistp384',
    'ecdh-sha2-nistp521',
    'diffie-hellman-group-exchange-sha256',
    'diffie-hellman-group14-sha256',
    'diffie-hellman-group15-sha512',
    'diffie-hellman-group16-sha512',
    'diffie-hellman-group17-sha512',
    'diffie-hellman-group18-sha512',
  ],
  serverHostKey: [
    'ssh-ed25519',
    'ecdsa-sha2-nistp256',
    'ecdsa-sha2-nistp384',
    'ecdsa-sha2-nistp521',
    'rsa-sha2-512',
    'rsa-sha2-256',
  ],
  hmac: [
    'hmac-sha2-256-etm@openssh.com',
    'hmac-sha2-512-etm@openssh.com',
    'hmac-sha2-256',
    'hmac-sha2-512',
  ],
};

export interface RemoteExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

interface SshClientError extends Error {
  level?: string;
}

interface PooledSession {
  key: string;
  client: Client;
  refs: number;
  dead: boolean;
  timer?: NodeJS.Timeout;
}

const sessions = new Map<string, PooledSession>();
const opening = new Map<string, Promise<PooledSession>>();

const sessionKey = (target: SshTarget): string =>
  createHash('sha256')
    .update(
      [
        target.connectorId,
        target.username,
        target.hostname,
        String(target.port),
        target.authType,
        target.skipHostKeyVerification ? '1' : '0',
        target.hostKey ?? '',
        target.allowLegacyAlgorithms ? '1' : '0',
        target.password ?? '',
        target.privateKey ?? '',
      ].join('\0')
    )
    .digest('hex');

/** Compares the key the server presents with the pinned blob. Runs before user authentication. */
const pinnedHostKeyMatches = (target: SshTarget, key: Buffer): boolean => {
  if (!target.hostKey) {
    return false;
  }
  const pinned = Buffer.from(target.hostKey, 'base64');
  if (pinned.length !== key.length) {
    return false;
  }
  return timingSafeEqual(pinned, key);
};

const normalizePrivateKey = (key: string): string => `${key.replace(/\r/g, '').trimEnd()}\n`;

const connectConfig = (target: SshTarget): ConnectConfig => {
  const config: ConnectConfig = {
    host: target.hostname,
    port: target.port,
    username: target.username,
    readyTimeout: CONNECT_TIMEOUT_MS,
    keepaliveInterval: KEEPALIVE_INTERVAL_MS,
    keepaliveCountMax: KEEPALIVE_COUNT_MAX,
  };

  if (!target.allowLegacyAlgorithms) {
    config.algorithms = MODERN_SSH_ALGORITHMS;
  }

  if (!target.skipHostKeyVerification) {
    config.hostVerifier = (key) => pinnedHostKeyMatches(target, key);
  }

  if (target.authType === AUTH_TYPE.Password) {
    config.password = target.password;
    return config;
  }

  config.privateKey = normalizePrivateKey(target.privateKey ?? '');
  return config;
};

const markDead = (session: PooledSession): void => {
  session.dead = true;
  if (session.timer) {
    clearTimeout(session.timer);
    session.timer = undefined;
  }
  if (sessions.get(session.key) === session) {
    sessions.delete(session.key);
  }
};

const openClient = (target: SshTarget, key: string): Promise<PooledSession> =>
  new Promise((resolve, reject) => {
    const client = new Client();
    let settled = false;
    const fail = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const onError = (error: Error) => {
      fail(error);
    };

    target.logger?.info(
      `SSH connector [${target.connectorId}] host key verification ${
        target.skipHostKeyVerification ? 'skipped' : 'pinned'
      }`
    );

    client.once('error', onError);
    client.once('ready', () => {
      if (settled) {
        return;
      }
      settled = true;
      client.removeListener('error', onError);
      const session: PooledSession = { key, client, refs: 0, dead: false };
      sessions.set(key, session);
      client.on('error', () => {
        markDead(session);
      });
      resolve(session);
    });

    try {
      client.connect(connectConfig(target));
    } catch (error) {
      fail(error);
    }
  });

const acquire = async (target: SshTarget): Promise<PooledSession> => {
  const key = sessionKey(target);
  const current = sessions.get(key);
  if (current && !current.dead) {
    current.refs += 1;
    if (current.timer) {
      clearTimeout(current.timer);
      current.timer = undefined;
    }
    return current;
  }

  let pending = opening.get(key);
  if (!pending) {
    pending = openClient(target, key).finally(() => {
      opening.delete(key);
    });
    opening.set(key, pending);
  }

  const session = await pending;
  if (session.dead) {
    const error = new Error('SSH connection closed') as SshClientError;
    error.level = 'client-socket';
    throw error;
  }
  session.refs += 1;
  if (session.timer) {
    clearTimeout(session.timer);
    session.timer = undefined;
  }
  return session;
};

const release = (session: PooledSession): void => {
  if (session.dead) {
    return;
  }
  session.refs -= 1;
  if (session.refs > 0) {
    return;
  }
  session.timer = setTimeout(() => {
    if (session.dead || session.refs > 0) {
      return;
    }
    markDead(session);
    try {
      session.client.end();
    } catch {
      // The socket is already closed.
    }
  }, SSH_SESSION_IDLE_MS);
  session.timer.unref?.();
};

const withSession = async <T>(
  target: SshTarget,
  run: (client: Client) => Promise<T>
): Promise<T> => {
  const session = await acquire(target);
  try {
    return await run(session.client);
  } finally {
    release(session);
  }
};

const remoteCommand = (): string =>
  "sh -c 'f=$(mktemp) || exit 1; " +
  'if command -v base64 >/dev/null 2>&1; then base64 -d > "$f"; else openssl base64 -d -A > "$f"; fi; ' +
  'bash "$f"; rc=$?; rm -f "$f"; exit $rc\'';

const execOnClient = (client: Client, script: string): Promise<RemoteExecResult> =>
  new Promise((resolve, reject) => {
    client.exec(remoteCommand(), (error, stream) => {
      if (error || !stream) {
        reject(error ?? new Error('Failed to start remote command'));
        return;
      }

      const stdoutChunks: Buffer[] = [];
      const stderrChunks: Buffer[] = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let settled = false;
      let aborted = false;

      const finish = (settle: () => void) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        settle();
      };
      const fail = (failure: Error) => {
        aborted = true;
        stream.destroy();
        finish(() => reject(failure));
      };
      const timer = setTimeout(() => {
        fail(
          new SshLocalFailure('timeout', `ssh timed out after ${COMMAND_TIMEOUT_MS / 1000} seconds`)
        );
      }, COMMAND_TIMEOUT_MS);

      const take = (chunks: Buffer[], bytes: number, chunk: Buffer): number => {
        const next = bytes + chunk.length;
        if (next > MAX_BUFFER_BYTES) {
          fail(
            new SshLocalFailure('output-limit', `ssh output exceeded ${MAX_BUFFER_BYTES} bytes`)
          );
          return bytes;
        }
        chunks.push(chunk);
        return next;
      };

      stream.on('data', (chunk: Buffer) => {
        stdoutBytes = take(stdoutChunks, stdoutBytes, chunk);
      });
      stream.stderr.on('data', (chunk: Buffer) => {
        stderrBytes = take(stderrChunks, stderrBytes, chunk);
      });
      stream.on('error', (streamError: Error) => {
        if (!aborted) {
          finish(() => reject(streamError));
        }
      });
      stream.on('close', (code: number | null) => {
        if (aborted) {
          return;
        }
        finish(() =>
          resolve({
            stdout: Buffer.concat(stdoutChunks).toString('utf8').trim(),
            stderr: Buffer.concat(stderrChunks).toString('utf8').trim(),
            code: typeof code === 'number' ? code : SSH_CLIENT_FAILURE_CODE,
          })
        );
      });

      stream.end(Buffer.from(script).toString('base64'));
    });
  });

const openSftp = (client: Client): Promise<SFTPWrapper> =>
  new Promise((resolve, reject) => {
    client.sftp((error, sftp) => {
      if (error || !sftp) {
        reject(error ?? new Error('Failed to start SFTP'));
        return;
      }
      resolve(sftp);
    });
  });

const sftpStat = (sftp: SFTPWrapper, remotePath: string): Promise<number> =>
  new Promise((resolve, reject) => {
    sftp.stat(remotePath, (error, stats) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stats.size);
    });
  });

const pathExists = async (sftp: SFTPWrapper, remotePath: string): Promise<boolean> => {
  try {
    await sftpStat(sftp, remotePath);
    return true;
  } catch (error) {
    const code = (error as { code?: number }).code;
    if (code === SFTP_NO_SUCH_FILE) {
      return false;
    }
    throw error;
  }
};

const sftpMkdir = (sftp: SFTPWrapper, remotePath: string): Promise<void> =>
  new Promise((resolve, reject) => {
    sftp.mkdir(remotePath, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

const ensureRemoteDir = async (sftp: SFTPWrapper, remoteDir: string): Promise<void> => {
  const absolute = remoteDir.startsWith('/');
  const parts = remoteDir.split('/').filter((part) => part.length > 0 && part !== '.');
  let current = '';

  for (const part of parts) {
    current = current === '' ? (absolute ? `/${part}` : part) : `${current}/${part}`;
    try {
      if (await pathExists(sftp, current)) {
        continue;
      }
      await sftpMkdir(sftp, current);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create remote directory ${current}: ${message}`);
    }
  }
};

const sftpRead = (sftp: SFTPWrapper, remotePath: string, maxBytes: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    const finish = (settle: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      settle();
    };
    const stream = sftp.createReadStream(remotePath);
    stream.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        stream.destroy();
        finish(() =>
          reject(
            new Error(
              `Remote file exceeds max-step-size (${total} bytes > ${maxBytes} bytes). Increase max-step-size on this step or download a smaller file.`
            )
          )
        );
        return;
      }
      chunks.push(chunk);
    });
    stream.on('error', (error: Error) => {
      finish(() => reject(error));
    });
    stream.on('end', () => {
      finish(() => resolve(Buffer.concat(chunks)));
    });
  });

const sftpWrite = (sftp: SFTPWrapper, remotePath: string, bytes: Buffer): Promise<void> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const finish = (settle: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      settle();
    };
    const stream = sftp.createWriteStream(remotePath);
    stream.on('error', (error: Error) => {
      finish(() => reject(new Error(`Failed to upload file to ${remotePath}: ${error.message}`)));
    });
    stream.on('close', () => {
      finish(() => resolve());
    });
    stream.end(bytes);
  });

const sizeLimitMessage = (size: number, maxBytes: number): string =>
  `Remote file exceeds max-step-size (${size} bytes > ${maxBytes} bytes). Increase max-step-size on this step or download a smaller file.`;

export const isSshClientFailure = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error instanceof SshLocalFailure) {
    return false;
  }
  const level = (error as SshClientError).level;
  if (
    level === 'client-socket' ||
    level === 'client-timeout' ||
    level === 'client-authentication' ||
    level === 'protocol' ||
    level === 'handshake'
  ) {
    return true;
  }
  return /authentication methods failed|Host denied \(verification failed\)|ECONN|ENOTFOUND|EHOSTUNREACH|EAI_AGAIN|ETIMEDOUT/i.test(
    error.message
  );
};

/** Maps ssh2 client errors onto the messages ssh.run already treats as permanent. */
export const normalizeClientError = (error: unknown): Error => {
  const err = error instanceof Error ? error : new Error(String(error));
  const level = (err as SshClientError).level;
  if (
    level === 'client-authentication' ||
    /all configured authentication methods failed/i.test(err.message)
  ) {
    return new Error(`Permission denied (${err.message})`);
  }
  if (/host denied \(verification failed\)/i.test(err.message)) {
    return new Error(`Host key verification failed: ${err.message}`);
  }
  return err;
};

export const execRemote = async (target: SshTarget, script: string): Promise<RemoteExecResult> =>
  withSession(target, (client) => execOnClient(client, script));

export const downloadRemote = async (
  target: SshTarget,
  remotePath: string,
  maxBytes: number
): Promise<Buffer> =>
  withSession(target, async (client) => {
    const sftp = await openSftp(client);
    try {
      let size: number;
      try {
        size = await sftpStat(sftp, remotePath);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to stat remote file ${remotePath}: ${message}`);
      }
      if (size > maxBytes) {
        throw new Error(sizeLimitMessage(size, maxBytes));
      }
      return await sftpRead(sftp, remotePath, maxBytes);
    } finally {
      sftp.end();
    }
  });

export const uploadRemote = async (
  target: SshTarget,
  remotePath: string,
  bytes: Buffer
): Promise<void> =>
  withSession(target, async (client) => {
    const sftp = await openSftp(client);
    try {
      const remoteDir = remotePath.includes('/')
        ? remotePath.slice(0, remotePath.lastIndexOf('/'))
        : '';
      if (remoteDir) {
        await ensureRemoteDir(sftp, remoteDir);
      }
      await sftpWrite(sftp, remotePath, bytes);
    } finally {
      sftp.end();
    }
  });

export const resetSshHostSessionsForTests = (): void => {
  for (const session of sessions.values()) {
    if (session.timer) {
      clearTimeout(session.timer);
    }
    session.dead = true;
    try {
      session.client.end();
    } catch {
      // already closed
    }
  }
  sessions.clear();
  opening.clear();
};
