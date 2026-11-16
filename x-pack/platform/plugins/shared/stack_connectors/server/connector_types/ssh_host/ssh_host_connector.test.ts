/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { AUTH_TYPE, CONNECTOR_ID } from '@kbn/connector-schemas/ssh_host';
import type { EventEmitter } from 'events';
import { Client } from 'ssh2';
import { parseHost, SshHostConnector } from './ssh_host_connector';
import { resetSshHostSessionsForTests, SSH_SESSION_IDLE_MS } from './ssh_host_session';

jest.mock('ssh2', () => {
  const { EventEmitter: Emitter } = jest.requireActual('events') as typeof import('events');
  const { Readable, Writable } = jest.requireActual('stream') as typeof import('stream');

  const createExecStream = (command: string) => {
    const stream = new Emitter();
    const execStream = Object.assign(stream, {
      stderr: new Emitter(),
      command,
      stdin: Buffer.alloc(0),
      write(chunk: Buffer | string) {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        execStream.stdin = Buffer.concat([execStream.stdin, buf]);
        return true;
      },
      end(chunk?: Buffer | string) {
        if (chunk !== undefined) {
          execStream.write(chunk);
        }
        const result = MockSshClient.nextExecResult;
        if (result.stdout) {
          execStream.emit('data', Buffer.from(result.stdout));
        }
        if (result.stderr) {
          execStream.stderr.emit('data', Buffer.from(result.stderr));
        }
        execStream.emit('close', result.code, null);
        return execStream;
      },
      close() {
        execStream.emit('close', null, 'KILL');
      },
      destroy() {
        execStream.emit('error', new Error('destroyed'));
        return execStream;
      },
    });
    return execStream;
  };

  const createSftp = () => {
    const sftp = {
      calls: [] as string[],
      files: new Map<string, Buffer>(),
      statSize: undefined as number | undefined,
      stat(path: string, callback: (err: Error | null, stats?: { size: number }) => void) {
        sftp.calls.push(`stat ${path}`);
        const file = sftp.files.get(path);
        if (file) {
          callback(null, { size: file.length });
          return;
        }
        if (sftp.statSize !== undefined) {
          callback(null, { size: sftp.statSize });
          return;
        }
        callback(Object.assign(new Error('No such file'), { code: 2 }));
      },
      mkdir(path: string, callback: (err: Error | null) => void) {
        sftp.calls.push(`mkdir ${path}`);
        callback(null);
      },
      createReadStream(path: string) {
        sftp.calls.push(`read ${path}`);
        return Readable.from([sftp.files.get(path) ?? Buffer.alloc(0)]);
      },
      createWriteStream(path: string) {
        sftp.calls.push(`write ${path}`);
        const chunks: Buffer[] = [];
        const stream = new Writable({
          write(chunk, _encoding, callback) {
            chunks.push(Buffer.from(chunk));
            callback();
          },
        });
        stream.on('finish', () => {
          sftp.files.set(path, Buffer.concat(chunks));
        });
        return stream;
      },
      end() {
        sftp.calls.push('end');
      },
    };
    return sftp;
  };

  interface MockClientInstance {
    config?: {
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      privateKey?: string;
      tryKeyboard?: boolean;
      readyTimeout?: number;
      keepaliveInterval?: number;
      keepaliveCountMax?: number;
      hostVerifier?: (key: Buffer, verify: (valid: boolean) => void) => boolean | void;
    };
    ended: boolean;
    emit(event: string, ...args: unknown[]): boolean;
  }

  const MockSshClient = function MockClient(this: MockClientInstance) {
    Emitter.call(this as unknown as EventEmitter);
    this.ended = false;
  } as unknown as {
    new (): MockClientInstance;
    prototype: {
      connect: (this: MockClientInstance, config: MockClientInstance['config']) => void;
      exec: (
        command: string,
        callback: (err: Error | undefined, stream: ReturnType<typeof createExecStream>) => void
      ) => void;
      sftp: (
        callback: (err: Error | undefined, sftp: ReturnType<typeof createSftp>) => void
      ) => void;
      end: (this: MockClientInstance) => void;
    };
    instances: MockClientInstance[];
    hostKey: Buffer;
    connectError: Error | null;
    nextExecResult: { stdout: string; stderr: string; code: number };
    sftp: ReturnType<typeof createSftp>;
    lastStream?: ReturnType<typeof createExecStream>;
    reset: () => void;
  };
  Object.setPrototypeOf(MockSshClient.prototype, Emitter.prototype);

  MockSshClient.prototype.connect = function connect(
    this: MockClientInstance,
    config: MockClientInstance['config']
  ) {
    this.config = config;
    MockSshClient.instances.push(this);
    if (typeof config?.hostVerifier === 'function') {
      const accepted = config.hostVerifier(MockSshClient.hostKey, () => undefined);
      if (accepted === false) {
        this.emit('error', new Error('Host denied (verification failed)'));
        return;
      }
    }
    if (MockSshClient.connectError) {
      this.emit('error', MockSshClient.connectError);
      return;
    }
    this.emit('ready');
  };

  MockSshClient.prototype.exec = function exec(
    command: string,
    callback: (err: Error | undefined, stream: ReturnType<typeof createExecStream>) => void
  ) {
    const stream = createExecStream(command);
    MockSshClient.lastStream = stream;
    callback(undefined, stream);
  };

  MockSshClient.prototype.sftp = function sftp(
    callback: (err: Error | undefined, sftp: ReturnType<typeof createSftp>) => void
  ) {
    callback(undefined, MockSshClient.sftp);
  };

  MockSshClient.prototype.end = function end(this: MockClientInstance) {
    this.ended = true;
    this.emit('end');
  };

  MockSshClient.reset = () => {
    MockSshClient.instances = [];
    MockSshClient.hostKey = Buffer.from('host-key-a');
    MockSshClient.connectError = null;
    MockSshClient.nextExecResult = { stdout: '', stderr: '', code: 0 };
    MockSshClient.sftp = createSftp();
    MockSshClient.lastStream = undefined;
  };
  MockSshClient.reset();

  return {
    Client: MockSshClient,
    utils: { sftp: { STATUS_CODE: { NO_SUCH_FILE: 2 } } },
  };
});

const MockClient = Client as unknown as {
  instances: Array<{
    config?: {
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      privateKey?: string;
      tryKeyboard?: boolean;
      readyTimeout?: number;
      keepaliveInterval?: number;
      keepaliveCountMax?: number;
      hostVerifier?: (key: Buffer, verify: (valid: boolean) => void) => boolean | void;
    };
    ended: boolean;
  }>;
  hostKey: Buffer;
  connectError: Error | null;
  nextExecResult: { stdout: string; stderr: string; code: number };
  sftp: {
    calls: string[];
    files: Map<string, Buffer>;
    statSize?: number;
  };
  lastStream?: { command: string; stdin: Buffer };
  reset: () => void;
};

describe('SshHostConnector', () => {
  const privateKey = '-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----';

  const createConnector = (
    overrides: {
      id?: string;
      host?: string;
      username?: string;
      authType?: (typeof AUTH_TYPE)[keyof typeof AUTH_TYPE];
      password?: string | null;
      sshPrivateKey?: string | null;
      skipHostKeyVerification?: boolean;
      configurationUtilities?: ReturnType<typeof actionsConfigMock.create>;
    } = {}
  ) =>
    new SshHostConnector({
      configurationUtilities: overrides.configurationUtilities ?? actionsConfigMock.create(),
      config: {
        host: overrides.host ?? 'example.com',
        authType: overrides.authType ?? AUTH_TYPE.PrivateKey,
        skipHostKeyVerification: overrides.skipHostKeyVerification ?? false,
      },
      connector: { id: overrides.id ?? '1', type: CONNECTOR_ID },
      secrets: {
        username: overrides.username ?? 'alice',
        sshPrivateKey: overrides.sshPrivateKey === undefined ? privateKey : overrides.sshPrivateKey,
        password: overrides.password === undefined ? null : overrides.password,
      },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });

  const connectConfig = () => MockClient.instances.at(-1)?.config;

  beforeEach(() => {
    resetSshHostSessionsForTests();
    MockClient.reset();
  });

  describe('exec', () => {
    it('refuses hosts not in allowedHosts before connecting', async () => {
      const configurationUtilities = actionsConfigMock.create();
      configurationUtilities.ensureHostnameAllowed.mockImplementation(() => {
        throw new Error('hostname is not in the xpack.actions.allowedHosts list');
      });

      await expect(
        createConnector({ configurationUtilities, host: 'evil.example.com' }).exec({
          script: 'true',
        })
      ).rejects.toThrow(/allowedHosts/);
      expect(configurationUtilities.ensureHostnameAllowed).toHaveBeenCalledWith('evil.example.com');
      expect(MockClient.instances).toHaveLength(0);
    });

    it('connects with ssh2 and sends the script as base64 on stdin', async () => {
      await createConnector().exec({ script: 'hostname -f' });

      expect(MockClient.instances).toHaveLength(1);
      expect(connectConfig()).toEqual(
        expect.objectContaining({
          host: 'example.com',
          port: 22,
          username: 'alice',
          readyTimeout: 10000,
          keepaliveInterval: 15000,
          keepaliveCountMax: 3,
        })
      );
      expect(connectConfig()?.hostVerifier).toEqual(expect.any(Function));
      expect(MockClient.lastStream?.command).toContain('base64 -d');
      expect(
        Buffer.from(MockClient.lastStream?.stdin.toString('utf8') ?? '', 'base64').toString()
      ).toBe('hostname -f');
    });

    it('skips host key verification only when explicitly enabled', async () => {
      await createConnector({ skipHostKeyVerification: true }).exec({ script: 'true' });

      expect(connectConfig()?.hostVerifier).toBeUndefined();
    });

    it('rejects a changed host key as a client failure', async () => {
      const connector = createConnector();
      await connector.exec({ script: 'true' });
      resetSshHostSessionsForTests();
      MockClient.hostKey = Buffer.from('host-key-b');

      const result = await connector.exec({ script: 'true' });

      expect(result.code).toBe(255);
      expect(result.stderr).toMatch(/Host key verification failed/i);
    });

    it('rejects a username with whitespace before connecting', async () => {
      const connector = createConnector({ username: 'alice; id' });

      await expect(connector.exec({ script: 'true' })).rejects.toThrow('Invalid SSH username');
      expect(MockClient.instances).toHaveLength(0);
    });

    it('rejects a username starting with a dash before connecting', async () => {
      const connector = createConnector({ username: '-oProxyCommand=id' });

      await expect(connector.exec({ script: 'true' })).rejects.toThrow('Invalid SSH username');
      expect(MockClient.instances).toHaveLength(0);
    });

    it('passes host:port to ssh2 separately from the hostname', async () => {
      await createConnector({ host: 'example.com:2222' }).exec({ script: 'true' });

      expect(connectConfig()).toEqual(expect.objectContaining({ host: 'example.com', port: 2222 }));
    });

    it('treats unbracketed IPv6 as host with port 22', async () => {
      await createConnector({ host: '::1' }).exec({ script: 'true' });

      expect(connectConfig()).toEqual(expect.objectContaining({ host: '::1', port: 22 }));
    });

    it('parses [ipv6]:port', async () => {
      await createConnector({ host: '[2001:db8::1]:2222' }).exec({ script: 'true' });

      expect(connectConfig()).toEqual(expect.objectContaining({ host: '2001:db8::1', port: 2222 }));
    });

    it('uses password auth without a local sshpass binary', async () => {
      await createConnector({
        authType: AUTH_TYPE.Password,
        password: 'secret',
        sshPrivateKey: null,
      }).exec({ script: 'true' });

      expect(connectConfig()).toEqual(
        expect.objectContaining({ password: 'secret', tryKeyboard: true })
      );
      expect(connectConfig()?.privateKey).toBeUndefined();
    });

    it('passes the private key to ssh2 and normalizes CRLF', async () => {
      await createConnector({
        sshPrivateKey:
          '-----BEGIN OPENSSH PRIVATE KEY-----\r\ntest\r\n-----END OPENSSH PRIVATE KEY-----\r\n',
      }).exec({ script: 'true' });

      expect(connectConfig()?.privateKey).toBe(
        '-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----\n'
      );
      expect(connectConfig()?.password).toBeUndefined();
    });

    it('throws when password auth has no password', async () => {
      await expect(
        createConnector({
          authType: AUTH_TYPE.Password,
          password: null,
          sshPrivateKey: null,
        }).exec({ script: 'true' })
      ).rejects.toThrow('Password is required for password authentication');
      expect(MockClient.instances).toHaveLength(0);
    });

    it('returns the remote exit code without throwing', async () => {
      MockClient.nextExecResult = { stdout: 'out', stderr: 'err', code: 7 };

      const result = await createConnector().exec({ script: 'false' });

      expect(result).toEqual({ stdout: 'out', stderr: 'err', code: 7 });
    });

    it('returns code 255 for an authentication failure', async () => {
      MockClient.connectError = Object.assign(
        new Error('All configured authentication methods failed'),
        { level: 'client-authentication' }
      );

      const result = await createConnector().exec({ script: 'true' });

      expect(result).toEqual({
        stdout: '',
        stderr: 'Permission denied (All configured authentication methods failed)',
        code: 255,
      });
    });

    it('returns code 255 when the host is unreachable', async () => {
      MockClient.connectError = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:22'), {
        level: 'client-socket',
      });

      const result = await createConnector().exec({ script: 'true' });

      expect(result.code).toBe(255);
      expect(result.stderr).toBe('connect ECONNREFUSED 127.0.0.1:22');
    });

    it('reuses one session per connector for the idle window', async () => {
      jest.useFakeTimers();
      try {
        const connector = createConnector({ id: 'conn-a' });
        await connector.exec({ script: 'true' });
        await connector.exec({ script: 'true' });
        expect(MockClient.instances).toHaveLength(1);

        await createConnector({ id: 'conn-b' }).exec({ script: 'true' });
        expect(MockClient.instances).toHaveLength(2);

        await createConnector({
          id: 'conn-a',
          authType: AUTH_TYPE.Password,
          password: 'secret',
          sshPrivateKey: null,
        }).exec({ script: 'true' });
        expect(MockClient.instances).toHaveLength(3);

        await jest.advanceTimersByTimeAsync(SSH_SESSION_IDLE_MS);
        expect(MockClient.instances[0].ended).toBe(true);

        await connector.exec({ script: 'true' });
        expect(MockClient.instances).toHaveLength(4);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('parseHost', () => {
    it('parses hostname, hostname:port, IPv6, and [IPv6]:port', () => {
      expect(parseHost('example.com')).toEqual({ hostname: 'example.com', port: 22 });
      expect(parseHost('example.com:2222')).toEqual({ hostname: 'example.com', port: 2222 });
      expect(parseHost('::1')).toEqual({ hostname: '::1', port: 22 });
      expect(parseHost('[2001:db8::1]')).toEqual({ hostname: '2001:db8::1', port: 22 });
      expect(parseHost('[2001:db8::1]:2222')).toEqual({ hostname: '2001:db8::1', port: 2222 });
    });
  });

  describe('downloadFile', () => {
    const remotePath = '/var/log/app.log"; id; echo "';

    it('reads the remote path over SFTP and returns base64', async () => {
      MockClient.sftp.files.set(remotePath, Buffer.from('hello'));

      const result = await createConnector().downloadFile({ remotePath });

      expect(result).toEqual({
        content: Buffer.from('hello').toString('base64'),
        encoding: 'base64',
      });
      expect(MockClient.sftp.calls).toEqual([`stat ${remotePath}`, `read ${remotePath}`, 'end']);
      expect(MockClient.lastStream).toBeUndefined();
    });

    it('connects to an IPv6 host without a shell destination', async () => {
      MockClient.sftp.files.set('/tmp/a', Buffer.from('hello'));

      await createConnector({ host: '::1' }).downloadFile({ remotePath: '/tmp/a' });

      expect(connectConfig()).toEqual(expect.objectContaining({ host: '::1', port: 22 }));
      expect(MockClient.sftp.calls).toContain('read /tmp/a');
    });

    it('rejects files larger than maxBytes before reading', async () => {
      MockClient.sftp.statSize = 17;

      await expect(
        createConnector().downloadFile({
          remotePath: '/var/log/huge.log',
          maxBytes: 4,
        })
      ).rejects.toThrow(/exceeds max-step-size/);
      expect(MockClient.sftp.calls).toEqual(['stat /var/log/huge.log', 'end']);
    });

    it('throws when the host is unreachable', async () => {
      MockClient.connectError = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:22'), {
        level: 'client-socket',
      });

      await expect(createConnector().downloadFile({ remotePath: '/tmp/a' })).rejects.toThrow(
        /ECONNREFUSED/
      );
    });
  });

  describe('uploadFile', () => {
    it('creates parent directories and writes the file over SFTP', async () => {
      await createConnector().uploadFile({
        remotePath: '/opt/app/config.json',
        content: Buffer.from('{"ok":true}').toString('base64'),
        encoding: 'base64',
      });

      expect(MockClient.sftp.calls).toEqual([
        'stat /opt',
        'mkdir /opt',
        'stat /opt/app',
        'mkdir /opt/app',
        'write /opt/app/config.json',
        'end',
      ]);
      expect(MockClient.sftp.files.get('/opt/app/config.json')?.toString('utf8')).toBe(
        '{"ok":true}'
      );
      expect(MockClient.lastStream).toBeUndefined();
    });
  });
});
