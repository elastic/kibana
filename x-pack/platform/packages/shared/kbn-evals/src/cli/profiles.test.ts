/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeExec } from './utils';
import { readVaultConfigFromDevVault, resetDevVaultConfigCache } from './profiles';

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

  it('logs why an invalid config was ignored without printing its contents', () => {
    mockedSafeExec.mockReturnValue(encode({ openrouter: { apiKey: 'leaked-secret' } }));

    expect(readVaultConfigFromDevVault()).toBeUndefined();
    const logged = stderr.mock.calls.map(([line]) => String(line)).join('');
    expect(logged).toContain('Ignoring invalid dev-vault config');
    expect(logged).not.toContain('leaked-secret');
  });
});
