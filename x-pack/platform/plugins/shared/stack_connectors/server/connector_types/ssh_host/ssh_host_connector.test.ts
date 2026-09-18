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
import { SshHostConnector } from './ssh_host_connector';

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
      host?: string;
      username?: string;
      authType?: (typeof AUTH_TYPE)[keyof typeof AUTH_TYPE];
      password?: string | null;
      sshPrivateKey?: string | null;
      skipHostKeyVerification?: boolean;
    } = {}
  ) =>
    new SshHostConnector({
      configurationUtilities: actionsConfigMock.create(),
      config: {
        host: overrides.host ?? 'example.com',
        authType: overrides.authType ?? AUTH_TYPE.PrivateKey,
        skipHostKeyVerification: overrides.skipHostKeyVerification ?? false,
      },
      connector: { id: '1', type: CONNECTOR_ID },
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
  });
});
