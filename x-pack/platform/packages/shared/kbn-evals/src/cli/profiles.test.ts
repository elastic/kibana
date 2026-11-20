/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Os from 'os';
import { FlagsReader, getFlags } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { safeExec } from './utils';
import {
  formatProfilesSummary,
  isExportProfileImplicitLocal,
  probeHttp,
  readEvaluationsKbnProfile,
  readSuiteSecretFromDevVault,
  readTracingProfile,
  readVaultConfigFromDevVault,
  resetDevVaultConfigCache,
  resolveDefaultJudgeConnectorId,
  warnOnDeprecatedProfileFlags,
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

describe('resolveDefaultJudgeConnectorId', () => {
  // A repo root without vault config files.
  const repoRoot = Os.tmpdir();

  beforeEach(() => {
    resetDevVaultConfigCache();
    mockedSafeExec.mockReset();
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses evaluationConnectorId from the dev-vault profile', () => {
    mockedSafeExec.mockReturnValue(encode(VALID_CONFIG));
    expect(resolveDefaultJudgeConnectorId(repoRoot, 'dev-vault')).toBe('judge');
  });

  it('is undefined when the profile has no config', () => {
    expect(resolveDefaultJudgeConnectorId(repoRoot, 'missing')).toBeUndefined();
  });

  it('is undefined when the profile value is a placeholder', () => {
    mockedSafeExec.mockReturnValue(
      encode({ ...VALID_CONFIG, evaluationConnectorId: 'REPLACE_ME' })
    );
    expect(resolveDefaultJudgeConnectorId(repoRoot, 'dev-vault')).toBeUndefined();
  });
});

describe('probeHttp', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('cancels the unread body once the headers arrive', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    globalThis.fetch = jest.fn().mockResolvedValue({ body: { cancel } }) as typeof fetch;

    await expect(probeHttp('http://es.example')).resolves.toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('stays reachable when cancelling the body fails', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      body: { cancel: jest.fn().mockRejectedValue(new Error('reset')) },
    }) as typeof fetch;

    await expect(probeHttp('http://es.example')).resolves.toBe(true);
  });

  it('returns false when the request fails', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline')) as typeof fetch;

    await expect(probeHttp('http://es.example')).resolves.toBe(false);
  });
});

const profileFlagOptions = {
  string: [
    'profile',
    'datasets-profile',
    'export-profile',
    'evaluations-kbn-profile',
    'tracing-profile',
  ],
};
const readProfileFlags = (argv: string[]): FlagsReader =>
  new FlagsReader(getFlags(argv, profileFlagOptions));

describe.each([
  {
    reader: readEvaluationsKbnProfile,
    readerName: 'readEvaluationsKbnProfile',
    newFlag: '--evaluations-kbn-profile',
    oldFlag: '--datasets-profile',
  },
  {
    reader: readTracingProfile,
    readerName: 'readTracingProfile',
    newFlag: '--tracing-profile',
    oldFlag: '--export-profile',
  },
])('$readerName', ({ reader, newFlag, oldFlag }) => {
  it('reads the new flag, falls back to the deprecated one, and prefers the new one', () => {
    expect(reader(readProfileFlags([newFlag, 'new']))).toBe('new');
    expect(reader(readProfileFlags([oldFlag, 'old']))).toBe('old');
    expect(reader(readProfileFlags([oldFlag, 'old', newFlag, 'new']))).toBe('new');
    expect(reader(readProfileFlags([]))).toBeUndefined();
  });
});

describe('warnOnDeprecatedProfileFlags', () => {
  const setup = (argv: string[]) => {
    const log = new ToolingLog();
    const warning = jest.spyOn(log, 'warning').mockImplementation(() => undefined);
    warnOnDeprecatedProfileFlags(readProfileFlags(argv), log);
    return warning;
  };

  it('stays quiet for the new flags and for --profile', () => {
    expect(
      setup(['--profile', 'local', '--evaluations-kbn-profile', 'a', '--tracing-profile', 'b'])
    ).not.toHaveBeenCalled();
  });

  it('warns once per deprecated flag, naming its replacement', () => {
    const warning = setup(['--datasets-profile', 'a', '--export-profile', 'b']);

    expect(warning).toHaveBeenCalledTimes(2);
    const messages = warning.mock.calls.map(([message]) => String(message));
    expect(messages[0]).toContain('--datasets-profile');
    expect(messages[0]).toContain('--evaluations-kbn-profile');
    expect(messages[1]).toContain('--export-profile');
    expect(messages[1]).toContain('--tracing-profile');
  });

  it('says the deprecated flag is ignored when the new one is passed with another value', () => {
    const warning = setup(['--export-profile', 'old', '--tracing-profile', 'new']);

    expect(warning).toHaveBeenCalledTimes(1);
    expect(String(warning.mock.calls[0][0])).toContain('ignored');
  });
});

describe('formatProfilesSummary', () => {
  it('names each profile after the flag that sets it, with defaults when unset', () => {
    expect(formatProfilesSummary({ evaluationsKbnProfile: 'scout', tracingProfile: 'scout' })).toBe(
      'evaluations-kbn=scout tracing=scout'
    );
    expect(formatProfilesSummary({})).toBe('evaluations-kbn=config tracing=none');
  });
});

describe('isExportProfileImplicitLocal', () => {
  it('is true for the auto-selected local tracing profile', () => {
    expect(isExportProfileImplicitLocal(readProfileFlags([]), 'local')).toBe(true);
  });

  it.each(['--tracing-profile', '--export-profile'])('is false when %s was passed', (flag) => {
    expect(isExportProfileImplicitLocal(readProfileFlags([flag, 'local']), 'local')).toBe(false);
  });
});
