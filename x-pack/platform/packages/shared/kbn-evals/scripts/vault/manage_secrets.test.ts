/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { chmod, readFile, writeFile } from 'fs/promises';
import execa from 'execa';
import { resolveEvalSuites, type EvalSuiteDefinition } from '../../src/cli/suites';
import { runScoutHook } from '../../src/cli/scout_hook';
import { resolveVaultTarget, retrieveConfigFromVault, uploadConfigToVault } from './manage_secrets';

jest.mock('execa');
jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  chmod: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));
jest.mock('../../src/cli/suites');
jest.mock('../../src/cli/scout_hook');

const mockedExeca = jest.mocked(execa);
const mockedChmod = jest.mocked(chmod);
const mockedReadFile = jest.mocked(readFile);
const mockedWriteFile = jest.mocked(writeFile);
const mockedResolveEvalSuites = jest.mocked(resolveEvalSuites);
const mockedRunScoutHook = jest.mocked(runScoutHook);

const SUITE_DIR = '/repo/x-pack/packages/kbn-evals-suite-my-suite';
const SUITE = {
  id: 'my-suite',
  absoluteConfigPath: Path.join(SUITE_DIR, 'playwright.config.ts'),
  scoutHook: 'x-pack/packages/kbn-evals-suite-my-suite/scout/scout_hook.sh',
  vaultSecret: 'my-suite',
} as EvalSuiteDefinition;
const SUITE_CONFIG = { sandbox: { apiKey: 'sandbox-key', url: 'https://sandbox.example' } };

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

    await uploadConfigToVault(resolveVaultTarget('ci-prod'));

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

    const error = await uploadConfigToVault(resolveVaultTarget('ci-prod')).catch((e: Error) => e);

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

    const error = await uploadConfigToVault(resolveVaultTarget('dev')).catch((e: Error) => e);

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

    await retrieveConfigFromVault(resolveVaultTarget('ci-prod'), 3);

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
    const [filePath, contents, writeOptions] = mockedWriteFile.mock.calls[0];
    expect(JSON.parse(String(contents))).toEqual(CONFIG);
    expect(writeOptions).toEqual({ mode: 0o600 });
    expect(mockedChmod).toHaveBeenCalledWith(filePath, 0o600);
  });

  it('leaves the local config untouched when the version cannot be read', async () => {
    mockedExeca.mockRejectedValue(
      Object.assign(new Error('failed'), {
        stderr: 'No value found at kv/data/ci-shared/kbn-evals/golden',
      })
    );

    await expect(retrieveConfigFromVault(resolveVaultTarget('ci-prod'), 99)).rejects.toThrow(
      'No value found'
    );
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });

  it('leaves the local config untouched when the version is not a valid config', async () => {
    mockedExeca.mockResolvedValue({ stdout: '' } as never);

    await expect(retrieveConfigFromVault(resolveVaultTarget('ci-prod'), 2)).rejects.toThrow();
    expect(mockedWriteFile).not.toHaveBeenCalled();
  });
});

describe('suite vault targets', () => {
  beforeEach(() => {
    mockedExeca.mockReset();
    mockedWriteFile.mockReset();
    mockedRunScoutHook.mockReset();
    mockedResolveEvalSuites.mockReturnValue([SUITE]);
    mockedReadFile.mockResolvedValue(JSON.stringify(SUITE_CONFIG) as never);
    jest.spyOn(Fs, 'existsSync').mockReturnValue(true);
    jest.spyOn(Fs.promises, 'mkdir').mockResolvedValue(undefined);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects a bare --suite, an unknown suite and a suite without vaultSecret', () => {
    for (const bare of ['', ' ']) {
      expect(() => resolveVaultTarget('ci-prod', bare)).toThrow('--suite needs a suite id');
    }
    expect(() => resolveVaultTarget('ci-prod', 'nope')).toThrow('Unknown eval suite "nope"');
    mockedResolveEvalSuites.mockReturnValue([{ ...SUITE, vaultSecret: undefined }]);
    expect(() => resolveVaultTarget('ci-prod', 'my-suite')).toThrow('has no vaultSecret');
  });

  it("points at the suite's secret and its local vault/config.json", () => {
    expect(resolveVaultTarget('ci-prod', 'my-suite')).toMatchObject({
      vaultPath: 'kv/ci-shared/kbn-evals/my-suite',
      filePath: Path.join(SUITE_DIR, 'vault', 'config.json'),
      exampleFilePath: Path.join(SUITE_DIR, 'vault', 'config.example.json'),
    });
  });

  it('uploads once the hook, run without shell credentials, prints an env', async () => {
    mockedRunScoutHook.mockReturnValue({ SANDBOX_API_KEY: 'sandbox-key' });
    mockedExeca.mockResolvedValue({ stdout: '' } as never);
    const originalEnv = process.env;
    process.env = { ...originalEnv, SANDBOX_API_KEY: 'ambient-key' };

    try {
      await uploadConfigToVault(resolveVaultTarget('ci-prod', 'my-suite'));
    } finally {
      process.env = originalEnv;
    }

    const [, hookPath, hookConfig, { env } = {}] = mockedRunScoutHook.mock.calls[0];
    expect(hookPath).toBe(SUITE.scoutHook);
    expect(hookConfig).toEqual(SUITE_CONFIG);
    expect(Object.keys(env ?? {}).sort()).toEqual(['HOME', 'PATH']);
    expect(env).not.toHaveProperty('SANDBOX_API_KEY');
    expect(mockedExeca.mock.calls[0][1]).toEqual([
      'kv',
      'put',
      'kv/ci-shared/kbn-evals/my-suite',
      'config=-',
    ]);
  });

  it('refuses the upload when the hook prints no env, e.g. for an unedited example', async () => {
    mockedRunScoutHook.mockReturnValue({});

    await expect(uploadConfigToVault(resolveVaultTarget('ci-prod', 'my-suite'))).rejects.toThrow(
      "produced no env for this config; CI would start Scout without this suite's env"
    );
    expect(mockedExeca).not.toHaveBeenCalled();
  });

  it('refuses the upload when the hook fails', async () => {
    mockedRunScoutHook.mockImplementation(() => {
      throw new Error('scoutHook exited with code 1');
    });

    await expect(uploadConfigToVault(resolveVaultTarget('ci-prod', 'my-suite'))).rejects.toThrow(
      'exited with code 1'
    );
    expect(mockedExeca).not.toHaveBeenCalled();
  });

  it("writes a retrieved suite secret under the suite's vault directory", async () => {
    mockedExeca.mockResolvedValue({
      stdout: Buffer.from(JSON.stringify(SUITE_CONFIG)).toString('base64'),
    } as never);

    await retrieveConfigFromVault(resolveVaultTarget('ci-prod', 'my-suite'));

    const [filePath, contents] = mockedWriteFile.mock.calls[0];
    expect(filePath).toBe(Path.join(SUITE_DIR, 'vault', 'config.json'));
    expect(JSON.parse(String(contents))).toEqual(SUITE_CONFIG);
  });
});
