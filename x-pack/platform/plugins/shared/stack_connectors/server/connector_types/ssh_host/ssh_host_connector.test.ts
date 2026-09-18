/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFile } from 'child_process';
import { writeFileSync } from 'fs';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { AUTH_TYPE, CONNECTOR_ID } from '@kbn/connector-schemas/ssh_host';
import { parseHost, SshHostConnector } from './ssh_host_connector';

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  return {
    ...actual,
    execFile: jest.fn(),
  };
});

const mockedExecFile = execFile as jest.MockedFunction<typeof execFile>;

const mockExecFileSuccess = (stdout = '', stderr = '') => {
  mockedExecFile.mockImplementation((bin, args, options, callback) => {
    const cb = typeof options === 'function' ? options : callback;
    cb?.(null, stdout, stderr);
    return {} as ReturnType<typeof execFile>;
  });
};

describe('SshHostConnector', () => {
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
        sshPrivateKey:
          overrides.sshPrivateKey === undefined
            ? '-----BEGIN OPENSSH PRIVATE KEY-----\ntest\n-----END OPENSSH PRIVATE KEY-----'
            : overrides.sshPrivateKey,
        password: overrides.password === undefined ? null : overrides.password,
      },
      logger: loggingSystemMock.createLogger(),
      services: actionsMock.createServices(),
    });

  beforeEach(() => {
    mockedExecFile.mockReset();
    mockExecFileSuccess();
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
      expect(mockedExecFile).not.toHaveBeenCalled();
    });

    it('invokes ssh with argv, not a shell string', async () => {
      const connector = createConnector();
      await connector.exec({ script: 'hostname -f' });

      expect(mockedExecFile).toHaveBeenCalledTimes(1);
      const [bin, args] = mockedExecFile.mock.calls[0];
      expect(bin).toBe('ssh');
      expect(args).toEqual(expect.any(Array));
      expect(args).toContain('alice@example.com');
      expect(args).toContain('-p');
      expect(args).toContain('22');
      expect((args as string[]).join(' ')).not.toMatch(/alice@example.com "/);
      expect(args).toContain('StrictHostKeyChecking=accept-new');
      expect(args).toEqual(
        expect.arrayContaining(['-o', expect.stringMatching(/^UserKnownHostsFile=.+kbn_ssh_kh_/)])
      );
    });

    it('skips host key verification only when explicitly enabled', async () => {
      const connector = createConnector({ skipHostKeyVerification: true });
      await connector.exec({ script: 'true' });

      const args = mockedExecFile.mock.calls[0][1] as string[];
      expect(args).toContain('StrictHostKeyChecking=no');
      expect(args).toContain('UserKnownHostsFile=/dev/null');
    });

    it('does not let a metacharacter username reach a shell', async () => {
      const connector = createConnector({ username: 'alice; id' });
      await connector.exec({ script: 'true' });

      const [bin, args] = mockedExecFile.mock.calls[0];
      expect(bin).toBe('ssh');
      expect(args).toContain('alice; id@example.com');
      expect(typeof args).toBe('object');
    });

    it('passes host:port as -p and a destination argv', async () => {
      const connector = createConnector({ host: 'example.com:2222' });
      await connector.exec({ script: 'true' });

      const args = mockedExecFile.mock.calls[0][1] as string[];
      expect(args).toContain('-p');
      expect(args[args.indexOf('-p') + 1]).toBe('2222');
      expect(args).toContain('alice@example.com');
    });

    it('treats unbracketed IPv6 as host with port 22', async () => {
      await createConnector({ host: '::1' }).exec({ script: 'true' });

      const args = mockedExecFile.mock.calls[0][1] as string[];
      expect(args).toContain('alice@::1');
      expect(args[args.indexOf('-p') + 1]).toBe('22');
    });

    it('parses [ipv6]:port for ssh', async () => {
      await createConnector({ host: '[2001:db8::1]:2222' }).exec({ script: 'true' });

      const args = mockedExecFile.mock.calls[0][1] as string[];
      expect(args).toContain('alice@2001:db8::1');
      expect(args[args.indexOf('-p') + 1]).toBe('2222');
    });

    it('uses sshpass argv for password auth', async () => {
      const connector = createConnector({
        authType: AUTH_TYPE.Password,
        password: 'secret',
        sshPrivateKey: null,
      });
      await connector.exec({ script: 'true' });

      const [bin, args, options] = mockedExecFile.mock.calls[0];
      expect(bin).toBe('sshpass');
      expect(args).toEqual(expect.arrayContaining(['-e', 'ssh']));
      expect((options as { env: NodeJS.ProcessEnv }).env.SSHPASS).toBe('secret');
    });

    it('returns the remote exit code without throwing', async () => {
      mockedExecFile.mockImplementation((bin, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const error = Object.assign(new Error('Command failed'), {
          code: 7,
          stdout: 'out',
          stderr: 'err',
        });
        cb?.(error, 'out', 'err');
        return {} as ReturnType<typeof execFile>;
      });

      const result = await createConnector().exec({ script: 'false' });
      expect(result).toEqual({ stdout: 'out', stderr: 'err', code: 7 });
    });

    it('names the missing binary on ENOENT', async () => {
      mockedExecFile.mockImplementation((bin, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const error = Object.assign(new Error(`spawn ${bin} ENOENT`), { code: 'ENOENT' });
        cb?.(error, '', '');
        return {} as ReturnType<typeof execFile>;
      });

      await expect(createConnector().exec({ script: 'true' })).rejects.toThrow(
        /ssh is not installed on the Kibana host/
      );

      await expect(
        createConnector({
          authType: AUTH_TYPE.Password,
          password: 'secret',
          sshPrivateKey: null,
        }).exec({ script: 'true' })
      ).rejects.toThrow(/sshpass is not installed on the Kibana host/);
    });

    it('scopes ControlPath to the connector and persists the master for 10s', async () => {
      await createConnector({
        id: 'conn-a',
        username: 'a'.repeat(256),
        host: `${'b'.repeat(200)}.example.com:22`,
      }).exec({ script: 'true' });
      const pathA = (mockedExecFile.mock.calls[0][1] as string[]).find((arg) =>
        arg.startsWith('ControlPath=')
      );

      mockedExecFile.mockClear();
      mockExecFileSuccess();
      await createConnector({
        id: 'conn-b',
        username: 'a'.repeat(256),
        host: `${'b'.repeat(200)}.example.com:22`,
      }).exec({ script: 'true' });
      const pathB = (mockedExecFile.mock.calls[0][1] as string[]).find((arg) =>
        arg.startsWith('ControlPath=')
      );

      mockedExecFile.mockClear();
      mockExecFileSuccess();
      await createConnector({
        id: 'conn-a',
        username: 'a'.repeat(256),
        host: `${'b'.repeat(200)}.example.com:22`,
      }).exec({ script: 'true' });
      const pathAAgain = (mockedExecFile.mock.calls[0][1] as string[]).find((arg) =>
        arg.startsWith('ControlPath=')
      );
      const persist = (mockedExecFile.mock.calls[0][1] as string[]).find((arg) =>
        arg.startsWith('ControlPersist=')
      );

      expect(pathA).toMatch(/^ControlPath=\/tmp\/kbn_cm_[a-f0-9]{12}$/);
      expect(pathA!.length).toBeLessThan(40);
      expect(pathB).not.toBe(pathA);
      expect(pathAAgain).toBe(pathA);
      expect(persist).toBe('ControlPersist=10s');
    });

    it('writes the private key under mkdtemp', async () => {
      await createConnector().exec({ script: 'true' });

      const args = mockedExecFile.mock.calls[0][1] as string[];
      const keyPath = args[args.indexOf('-i') + 1];
      expect(keyPath).toMatch(/ssh_host_key_/);
      expect(keyPath).toMatch(/\/id$/);
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
    it('invokes scp with a destination argv, not a quoted shell target', async () => {
      mockedExecFile.mockImplementation((bin, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const localPath = (args as string[])[(args as string[]).length - 1];
        writeFileSync(localPath, 'hello');
        cb?.(null, '', '');
        return {} as ReturnType<typeof execFile>;
      });

      const connector = createConnector();
      const result = await connector.downloadFile({
        remotePath: '/var/log/app.log"; id; echo "',
      });

      expect(result).toEqual({
        content: Buffer.from('hello').toString('base64'),
        encoding: 'base64',
      });

      const [bin, args] = mockedExecFile.mock.calls[0];
      expect(bin).toBe('scp');
      expect(args).toContain('alice@example.com:/var/log/app.log"; id; echo "');
      expect((args as string[]).some((arg) => arg.includes(':"/'))).toBe(false);
    });

    it('brackets IPv6 in the scp destination', async () => {
      mockedExecFile.mockImplementation((bin, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const localPath = (args as string[])[(args as string[]).length - 1];
        writeFileSync(localPath, 'hello');
        cb?.(null, '', '');
        return {} as ReturnType<typeof execFile>;
      });

      await createConnector({ host: '::1' }).downloadFile({ remotePath: '/tmp/a' });

      const args = mockedExecFile.mock.calls[0][1] as string[];
      expect(args).toContain('alice@[::1]:/tmp/a');
    });

    it('rejects files larger than maxBytes', async () => {
      mockedExecFile.mockImplementation((bin, args, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const localPath = (args as string[])[(args as string[]).length - 1];
        writeFileSync(localPath, 'too-large-payload');
        cb?.(null, '', '');
        return {} as ReturnType<typeof execFile>;
      });

      await expect(
        createConnector().downloadFile({
          remotePath: '/var/log/huge.log',
          maxBytes: 4,
        })
      ).rejects.toThrow(/exceeds max-step-size/);
    });
  });

  describe('uploadFile', () => {
    it('uploads with scp argv instead of stuffing the payload into ssh exec', async () => {
      const connector = createConnector();
      await connector.uploadFile({
        remotePath: '/opt/app/config.json',
        content: Buffer.from('{"ok":true}').toString('base64'),
        encoding: 'base64',
      });

      expect(mockedExecFile).toHaveBeenCalledTimes(2);
      const [mkdirBin, mkdirArgs] = mockedExecFile.mock.calls[0];
      expect(mkdirBin).toBe('ssh');
      expect(mkdirArgs).toContain('mkdir -p -- "/opt/app"');

      const [scpBin, scpArgs] = mockedExecFile.mock.calls[1];
      expect(scpBin).toBe('scp');
      expect(scpArgs).toContain('alice@example.com:/opt/app/config.json');
      expect((scpArgs as string[]).join(' ')).not.toContain('openssl');
    });
  });
});
