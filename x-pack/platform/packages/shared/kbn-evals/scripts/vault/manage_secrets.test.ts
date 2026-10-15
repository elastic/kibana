/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { readFile, writeFile } from 'fs/promises';
import execa from 'execa';
import { retrieveConfigFromVault, uploadConfigToVault } from './manage_secrets';

jest.mock('execa');
jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

const mockedExeca = jest.mocked(execa);
const mockedReadFile = jest.mocked(readFile);
const mockedWriteFile = jest.mocked(writeFile);

const CONFIG = {
  openrouter: { baseUrl: 'https://openrouter.example', apiKey: 'or-secret-key' },
  evaluationConnectorId: 'judge',
  evaluationsEs: { url: 'https://es.example', apiKey: 'es-secret-key' },
};

describe('uploadConfigToVault', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, VAULT_ADDR: 'https://secrets.elastic.co' };
    delete process.env.KBN_EVALS_CI_PROD_VAULT_ADDR;
    jest.spyOn(Fs, 'existsSync').mockReturnValue(true);
    mockedReadFile.mockResolvedValue(JSON.stringify(CONFIG) as never);
    mockedExeca.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('writes the config through stdin to the ci-prod Vault, whatever VAULT_ADDR is', async () => {
    mockedExeca.mockResolvedValue({ stdout: '' } as never);

    await uploadConfigToVault('ci-prod');

    const [command, args, options] = mockedExeca.mock.calls[0] as unknown as [
      string,
      string[],
      execa.Options
    ];
    expect(command).toBe('vault');
    expect(args).toEqual(['kv', 'put', 'kv/ci-shared/kbn-evals/golden', 'config=-']);
    expect(args.join(' ')).not.toContain('secret-key');
    expect(options.env?.VAULT_ADDR).toBe('https://vault-ci-prod.elastic.dev');
    expect(JSON.parse(Buffer.from(String(options.input), 'base64').toString('utf-8'))).toEqual(
      CONFIG
    );
  });

  it('names the vault and its login command on failure without echoing the config', async () => {
    mockedExeca.mockRejectedValue(
      Object.assign(new Error('Command failed with exit code 2: vault kv put ... config=-'), {
        shortMessage: 'Command failed with exit code 2: vault kv put ... config=-',
        stderr: 'Code: 403. Errors:\n\n* permission denied',
      })
    );

    const error = await uploadConfigToVault('ci-prod').catch((e: Error) => e);

    expect(error).toBeInstanceOf(Error);
    const { message } = error as Error;
    expect(message).toContain('vault kv put against the ci-prod vault');
    expect(message).toContain('permission denied');
    expect(message).toContain('vault login -address=https://vault-ci-prod.elastic.dev');
    expect(message).not.toContain('secret-key');
  });

  it('falls back to the short message when vault prints nothing to stderr', async () => {
    mockedExeca.mockRejectedValue(
      Object.assign(new Error('full message with stdout'), {
        shortMessage: 'Command failed with ENOENT: vault kv put',
        stderr: '',
      })
    );

    const error = await uploadConfigToVault('dev').catch((e: Error) => e);

    expect((error as Error).message).toContain('Command failed with ENOENT: vault kv put');
    expect((error as Error).message).not.toContain('full message with stdout');
  });
});

describe('retrieveConfigFromVault', () => {
  const encoded = Buffer.from(JSON.stringify(CONFIG)).toString('base64');

  beforeEach(() => {
    mockedExeca.mockReset();
    mockedWriteFile.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads an earlier version from the ci-prod Vault, e.g. to roll back', async () => {
    mockedExeca.mockResolvedValue({ stdout: encoded } as never);

    await retrieveConfigFromVault('ci-prod', 3);

    const [, args, options] = mockedExeca.mock.calls[0] as unknown as [
      string,
      string[],
      execa.Options
    ];
    expect(args).toEqual([
      'kv',
      'get',
      '-field=config',
      '-version=3',
      'kv/ci-shared/kbn-evals/golden',
    ]);
    expect(options.env?.VAULT_ADDR).toBe('https://vault-ci-prod.elastic.dev');
    expect(JSON.parse(String(mockedWriteFile.mock.calls[0][1]))).toEqual(CONFIG);
  });

  it('leaves the local config untouched when the version cannot be read', async () => {
    mockedExeca.mockRejectedValue(
      Object.assign(new Error('failed'), {
        stderr: 'No value found at kv/data/ci-shared/kbn-evals/golden',
      })
    );

    await expect(retrieveConfigFromVault('ci-prod', 99)).rejects.toThrow('No value found');
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  it('leaves the local config untouched when the version is not a valid config', async () => {
    mockedExeca.mockResolvedValue({ stdout: '' } as never);

    await expect(retrieveConfigFromVault('ci-prod', 2)).rejects.toThrow();
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });
});
