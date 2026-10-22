/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeExec } from './utils';
import {
  readSuiteSecretFromDevVault,
  readVaultConfigFromDevVault,
  resetDevVaultConfigCache,
} from './profiles';

jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  safeExec: jest.fn(),
}));

const mockedSafeExec = jest.mocked(safeExec);

const VALID_CONFIG = {
  openrouter: { baseUrl: 'https://openrouter.example', apiKey: 'or-key' },
  evaluationConnectorId: 'judge',
  evaluationsEs: { url: 'https://es.example', apiKey: 'es-key' },
  sandbox: { apiKey: 'sandbox-secret' },
};
const encode = (config: object) => Buffer.from(JSON.stringify(config)).toString('base64');

describe('readVaultConfigFromDevVault', () => {
  let stderr: jest.SpyInstance;

  beforeEach(() => {
    resetDevVaultConfigCache();
    mockedSafeExec.mockReset();
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderr.mockRestore();
  });

  it('reads Vault once per process and reuses the result', () => {
    mockedSafeExec.mockReturnValue(encode(VALID_CONFIG));

    const first = readVaultConfigFromDevVault();
    const second = readVaultConfigFromDevVault();

    expect(mockedSafeExec).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first).toMatchObject({ sandbox: { apiKey: 'sandbox-secret' } });
  });

  it('keeps the first successful read even if Vault would fail on a later call', () => {
    mockedSafeExec.mockReturnValueOnce(encode(VALID_CONFIG)).mockReturnValue(null);

    readVaultConfigFromDevVault();
    expect(readVaultConfigFromDevVault()).toMatchObject({ evaluationConnectorId: 'judge' });
  });

  it('logs a failed read and retries on the next call, e.g. after vault login', () => {
    mockedSafeExec.mockReturnValueOnce(null).mockReturnValueOnce(encode(VALID_CONFIG));

    expect(readVaultConfigFromDevVault()).toBeUndefined();
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Could not read'));
    expect(readVaultConfigFromDevVault()).toMatchObject({ evaluationConnectorId: 'judge' });
  });

  const loggedOutput = () => stderr.mock.calls.map(([line]) => String(line)).join('');

  it('logs a schema-invalid config without printing its contents', () => {
    mockedSafeExec.mockReturnValue(encode({ openrouter: { apiKey: 'leaked-secret' } }));

    expect(readVaultConfigFromDevVault()).toBeUndefined();
    expect(loggedOutput()).toContain('does not match the evals config schema');
    expect(loggedOutput()).not.toContain('leaked-secret');
  });

  it('logs malformed JSON without echoing the parser error, which quotes the input', () => {
    mockedSafeExec.mockReturnValue(
      Buffer.from('{"sandbox": {"apiKey": leaked-secret}}').toString('base64')
    );

    expect(readVaultConfigFromDevVault()).toBeUndefined();
    expect(loggedOutput()).toContain('not valid base64-encoded JSON');
    expect(loggedOutput()).not.toContain('leaked-secret');
  });
});

describe('readSuiteSecretFromDevVault', () => {
  let stderr: jest.SpyInstance;

  const SUITE_SECRET = { sandbox: { apiKey: 'sandbox-secret' } };
  const loggedOutput = () => stderr.mock.calls.map(([line]) => String(line)).join('');

  beforeEach(() => {
    resetDevVaultConfigCache();
    mockedSafeExec.mockReset();
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderr.mockRestore();
  });

  it("reads the suite's own dev Vault path, not the general config", () => {
    mockedSafeExec.mockReturnValue(encode(SUITE_SECRET));

    expect(readSuiteSecretFromDevVault('nightshift')).toEqual(SUITE_SECRET);
    expect(mockedSafeExec).toHaveBeenCalledWith('vault', [
      'read',
      '-field=config',
      'secret/kibana-issues/dev/kbn-evals/nightshift',
    ]);
  });

  it('caches each secret separately from the general config and from other secrets', () => {
    mockedSafeExec.mockImplementation((_command, args) =>
      encode(args[2].endsWith('/golden') ? VALID_CONFIG : { secret: args[2] })
    );

    const first = readSuiteSecretFromDevVault('nightshift');
    expect(readSuiteSecretFromDevVault('nightshift')).toBe(first);
    expect(readSuiteSecretFromDevVault('other')).toEqual({
      secret: 'secret/kibana-issues/dev/kbn-evals/other',
    });
    expect(readVaultConfigFromDevVault()).toMatchObject({ evaluationConnectorId: 'judge' });
    expect(mockedSafeExec).toHaveBeenCalledTimes(3);
  });

  it('does not cache a failed read, so it can succeed after vault login', () => {
    mockedSafeExec.mockReturnValueOnce(null).mockReturnValueOnce(encode(SUITE_SECRET));

    expect(readSuiteSecretFromDevVault('nightshift')).toBeUndefined();
    expect(loggedOutput()).toContain(
      "Could not read secret/kibana-issues/dev/kbn-evals/nightshift from Vault; the suite's scoutHook gets an empty config"
    );
    expect(readSuiteSecretFromDevVault('nightshift')).toEqual(SUITE_SECRET);
  });

  it('rejects a non-object secret without printing its contents', () => {
    mockedSafeExec.mockReturnValue(encode(['leaked-secret']));

    expect(readSuiteSecretFromDevVault('nightshift')).toBeUndefined();
    expect(loggedOutput()).toContain('does not match the suite config shape');
    expect(loggedOutput()).not.toContain('leaked-secret');
  });
});
