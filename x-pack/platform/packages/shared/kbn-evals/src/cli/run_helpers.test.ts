/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlagsReader, getFlags } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import {
  buildEvalRunArgs,
  buildEvalRunEnv,
  ensureEvalInit,
  evalRunFlags,
  loadScoutHookConfig,
  readConcurrencyFlag,
  readSkipServerFlag,
  resolveEvaluationConnectorId,
  resolveProfileEnvOverrides,
} from './run_helpers';
import type { EvalSuiteDefinition } from './suites';
import {
  defaultExportProfile,
  envFromDatasetsProfile,
  envFromExportProfile,
  loadVaultConfig,
  readSuiteSecretFromDevVault,
  resolveDefaultJudgeConnectorId,
} from './profiles';
import { isTTY, promptForConnector } from './prompts';
import { readCachedEisConnectors } from './eis_connectors_cache';

jest.mock('./profiles', () => ({
  ...jest.requireActual('./profiles'),
  loadVaultConfig: jest.fn(),
  defaultExportProfile: jest.fn(),
  envFromDatasetsProfile: jest.fn(),
  envFromExportProfile: jest.fn(),
  readSuiteSecretFromDevVault: jest.fn(),
  resolveDefaultJudgeConnectorId: jest.fn(),
}));

jest.mock('./eis_connectors_cache', () => ({
  readCachedEisConnectors: jest.fn(),
}));

jest.mock('./commands/init', () => ({
  ...jest.requireActual('./commands/init'),
  ensureLocalConfig: jest.fn(),
  runConnectorSetup: jest.fn(),
}));

jest.mock('./prompts', () => ({
  ...jest.requireActual('./prompts'),
  isTTY: jest.fn(),
  promptForConnector: jest.fn(),
}));

const mockedLoadVaultConfig = jest.mocked(loadVaultConfig);
const mockedReadSuiteSecret = jest.mocked(readSuiteSecretFromDevVault);

const readFlags = (argv: string[]): FlagsReader => new FlagsReader(getFlags(argv, evalRunFlags));

describe('loadScoutHookConfig', () => {
  const originalCiHookConfig = process.env.KBN_EVALS_SCOUT_HOOK_CONFIG_B64;
  const generalConfig = {
    evaluationsKbn: { url: 'https://kbn.example' },
    sandbox: { apiKey: 'from-general' },
  };
  const suiteSecret = { sandbox: { apiKey: 'from-suite-secret' } };

  beforeEach(() => {
    delete process.env.KBN_EVALS_SCOUT_HOOK_CONFIG_B64;
    mockedLoadVaultConfig.mockReset().mockReturnValue(generalConfig);
    mockedReadSuiteSecret.mockReset().mockReturnValue(suiteSecret);
  });

  afterEach(() => {
    if (originalCiHookConfig === undefined) {
      delete process.env.KBN_EVALS_SCOUT_HOOK_CONFIG_B64;
    } else {
      process.env.KBN_EVALS_SCOUT_HOOK_CONFIG_B64 = originalCiHookConfig;
    }
  });

  it('reuses the suite config CI supplied to the initial hook when the CLI runs it again', () => {
    const ciConfig = {
      ...suiteSecret,
      nightshiftOrcaEs: { url: 'https://orca.example', apiKey: 'orca-key' },
    };
    process.env.KBN_EVALS_SCOUT_HOOK_CONFIG_B64 = Buffer.from(JSON.stringify(ciConfig)).toString(
      'base64'
    );
    mockedLoadVaultConfig.mockReturnValue(undefined);

    expect(loadScoutHookConfig('/repo', undefined, { vaultSecret: 'nightshift' })).toEqual(
      ciConfig
    );
    expect(mockedLoadVaultConfig).not.toHaveBeenCalled();
    expect(mockedReadSuiteSecret).not.toHaveBeenCalled();
  });

  it.each(['not-json-with-private-value', '[]', 'null', '"private-value"'])(
    'rejects an invalid CI hook config without exposing its contents (%s)',
    (config) => {
      process.env.KBN_EVALS_SCOUT_HOOK_CONFIG_B64 = Buffer.from(config).toString('base64');

      expect(() => loadScoutHookConfig('/repo', undefined, {})).toThrow(
        'CI scout-hook config must encode a JSON object'
      );
    }
  );

  it('keeps an explicit file profile ahead of the inherited CI hook config', () => {
    process.env.KBN_EVALS_SCOUT_HOOK_CONFIG_B64 = Buffer.from(JSON.stringify(suiteSecret)).toString(
      'base64'
    );

    expect(loadScoutHookConfig('/repo', 'local', { vaultSecret: 'nightshift' })).toBe(
      generalConfig
    );
  });

  it("gives the hook the suite's own secret with the dev-vault profile", () => {
    expect(loadScoutHookConfig('/repo', 'dev-vault', { vaultSecret: 'nightshift' })).toBe(
      suiteSecret
    );
    expect(mockedReadSuiteSecret).toHaveBeenCalledWith('nightshift');
    expect(mockedLoadVaultConfig).not.toHaveBeenCalled();
  });

  it('gives the hook an empty config when the suite secret cannot be read', () => {
    mockedReadSuiteSecret.mockReturnValue(undefined);

    expect(loadScoutHookConfig('/repo', 'dev-vault', { vaultSecret: 'nightshift' })).toEqual({});
    expect(mockedLoadVaultConfig).not.toHaveBeenCalled();
  });

  it('keeps passing the profile JSON for a file profile, even with a vaultSecret', () => {
    expect(loadScoutHookConfig('/repo', 'local', { vaultSecret: 'nightshift' })).toBe(
      generalConfig
    );
    expect(mockedLoadVaultConfig).toHaveBeenCalledWith('/repo', 'local');
    expect(mockedReadSuiteSecret).not.toHaveBeenCalled();
  });

  it('passes the general dev-vault config to suites without a vaultSecret', () => {
    expect(loadScoutHookConfig('/repo', 'dev-vault', {})).toBe(generalConfig);
    expect(mockedLoadVaultConfig).toHaveBeenCalledWith('/repo', 'dev-vault');
    expect(mockedReadSuiteSecret).not.toHaveBeenCalled();
  });
});

describe('readConcurrencyFlag', () => {
  it('is undefined when --concurrency is not passed', () => {
    expect(readConcurrencyFlag(readFlags([]))).toBeUndefined();
  });

  it('reads a positive integer', () => {
    expect(readConcurrencyFlag(readFlags(['--concurrency', '8']))).toBe('8');
  });

  it.each(['0', 'abc', '-2', '2.5'])('rejects --concurrency %s with a flag error', (value) => {
    expect(() => readConcurrencyFlag(readFlags([`--concurrency=${value}`]))).toThrow(
      expect.objectContaining({
        message: `--concurrency must be a positive integer, got "${value}".`,
        showHelp: true,
      })
    );
  });
});

describe('readConcurrencyFlag with EVAL_CONCURRENCY', () => {
  const previous = process.env.EVAL_CONCURRENCY;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.EVAL_CONCURRENCY;
    } else {
      process.env.EVAL_CONCURRENCY = previous;
    }
  });

  it('rejects an invalid EVAL_CONCURRENCY with a flag error when the flag is not passed', () => {
    process.env.EVAL_CONCURRENCY = '0';
    expect(() => readConcurrencyFlag(readFlags([]))).toThrow(
      expect.objectContaining({
        message: 'EVAL_CONCURRENCY must be a positive integer, got "0".',
        showHelp: true,
      })
    );
  });

  it('leaves a valid EVAL_CONCURRENCY for the Playwright config to read', () => {
    process.env.EVAL_CONCURRENCY = '8';
    expect(readConcurrencyFlag(readFlags([]))).toBeUndefined();
  });

  it('lets the flag win over an invalid EVAL_CONCURRENCY', () => {
    process.env.EVAL_CONCURRENCY = 'abc';
    expect(readConcurrencyFlag(readFlags(['--concurrency', '4']))).toBe('4');
  });
});

describe('--concurrency forwarding', () => {
  const log = new ToolingLog();

  it('sets EVAL_CONCURRENCY for the Playwright run', () => {
    const env = buildEvalRunEnv({
      evaluationConnectorId: 'judge',
      requiresEisCcm: false,
      skipServer: true,
      profileEnvOverrides: {},
      suiteScoutEnv: {},
      flagsReader: readFlags(['--concurrency', '8']),
      log,
    });

    expect(env.EVAL_CONCURRENCY).toBe('8');
  });

  it('leaves EVAL_CONCURRENCY unset when the flag is not passed', () => {
    const env = buildEvalRunEnv({
      evaluationConnectorId: 'judge',
      requiresEisCcm: false,
      skipServer: true,
      profileEnvOverrides: {},
      suiteScoutEnv: {},
      flagsReader: readFlags([]),
      log,
    });

    expect(env).not.toHaveProperty('EVAL_CONCURRENCY');
  });

  it('passes --concurrency on to the re-run args', () => {
    const args = buildEvalRunArgs({
      suiteId: 'agent-builder',
      evaluationConnectorId: 'judge',
      projects: [],
      flagsReader: readFlags(['--concurrency', '8']),
    });

    expect(args).toEqual(expect.arrayContaining(['--concurrency', '8']));
  });
});

describe('resolveEvaluationConnectorId', () => {
  const repoRoot = '/repo';
  const originalConnectorId = process.env.EVAL_CONNECTOR_ID;
  const log = new ToolingLog();
  const suite = { id: 'pinned', defaultJudge: 'eis-pinned' } as EvalSuiteDefinition;
  const DEFAULT_JUDGE = 'eis-default-judge';

  const resolve = (argv: string[], withSuite?: EvalSuiteDefinition, profile?: string) =>
    resolveEvaluationConnectorId(repoRoot, log, readFlags(argv), withSuite, profile);

  beforeEach(() => {
    delete process.env.EVAL_CONNECTOR_ID;
    jest.mocked(isTTY).mockReturnValue(false);
    jest.mocked(promptForConnector).mockReset();
    jest.mocked(resolveDefaultJudgeConnectorId).mockReturnValue(undefined);
  });

  afterEach(() => {
    if (originalConnectorId === undefined) {
      delete process.env.EVAL_CONNECTOR_ID;
    } else {
      process.env.EVAL_CONNECTOR_ID = originalConnectorId;
    }
  });

  it('prefers --evaluation-connector-id over the env var and the suite default', async () => {
    process.env.EVAL_CONNECTOR_ID = 'from-env';
    await expect(resolve(['--evaluation-connector-id', 'from-flag'], suite)).resolves.toBe(
      'from-flag'
    );
  });

  it('prefers EVAL_CONNECTOR_ID over the suite default', async () => {
    process.env.EVAL_CONNECTOR_ID = 'from-env';
    await expect(resolve([], suite)).resolves.toBe('from-env');
  });

  it('falls back to the suite defaultJudge, including for an empty EVAL_CONNECTOR_ID', async () => {
    process.env.EVAL_CONNECTOR_ID = '';
    await expect(resolve([], suite)).resolves.toBe('eis-pinned');
  });

  it('requires a judge when neither a flag, the env var nor a suite default is set', async () => {
    await expect(resolve([])).rejects.toThrow('EVAL_CONNECTOR_ID is required');
  });

  it('prompts with the profile default judge pre-selected on a TTY', async () => {
    jest.mocked(isTTY).mockReturnValue(true);
    jest.mocked(resolveDefaultJudgeConnectorId).mockReturnValue(DEFAULT_JUDGE);
    jest.mocked(promptForConnector).mockResolvedValue('picked');

    await expect(resolve([], undefined, 'dev-vault')).resolves.toBe('picked');
    expect(resolveDefaultJudgeConnectorId).toHaveBeenCalledWith(repoRoot, 'dev-vault');
    expect(promptForConnector).toHaveBeenCalledWith(repoRoot, log, undefined, DEFAULT_JUDGE);
  });

  it('prompts without a pre-selection on a TTY when the profile has no default judge', async () => {
    jest.mocked(isTTY).mockReturnValue(true);
    jest.mocked(promptForConnector).mockResolvedValue('picked');

    await expect(resolve([])).resolves.toBe('picked');
    expect(promptForConnector).toHaveBeenCalledWith(repoRoot, log, undefined, undefined);
  });

  it('uses the profile default judge without prompting when there is no TTY', async () => {
    jest.mocked(resolveDefaultJudgeConnectorId).mockReturnValue(DEFAULT_JUDGE);

    await expect(resolve([], undefined, 'dev-vault')).resolves.toBe(DEFAULT_JUDGE);
    expect(promptForConnector).not.toHaveBeenCalled();
  });
});

describe('ensureEvalInit connector guard', () => {
  const log = new ToolingLog();
  const envKeys = ['KIBANA_TESTING_INFERENCE_ENDPOINTS', 'KIBANA_TESTING_AI_CONNECTORS'] as const;
  const saved = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

  beforeEach(() => {
    envKeys.forEach((key) => delete process.env[key]);
    jest.mocked(isTTY).mockReturnValue(false);
    jest.mocked(readCachedEisConnectors).mockReset();
  });

  afterEach(() => {
    envKeys.forEach((key) => {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    });
  });

  it('loads cached EIS connectors instead of failing without a TTY', async () => {
    jest.mocked(readCachedEisConnectors).mockReturnValue({ 'eis-model': { name: 'EIS model' } });

    await expect(ensureEvalInit('/repo', log, readFlags(['--profile', 'local']))).resolves.toBe(
      'local'
    );

    const loaded = JSON.parse(
      Buffer.from(process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS!, 'base64').toString('utf-8')
    );
    expect(loaded).toEqual({ 'eis-model': { name: 'EIS model' } });
  });

  it('still fails without a TTY when there is neither an env list nor a cache', async () => {
    jest.mocked(readCachedEisConnectors).mockReturnValue(undefined);

    await expect(ensureEvalInit('/repo', log, readFlags(['--profile', 'local']))).rejects.toThrow(
      'No connectors available'
    );
  });

  it('does not touch the cache when KIBANA_TESTING_INFERENCE_ENDPOINTS is already set', async () => {
    const existing = Buffer.from(JSON.stringify({ 'eis-env': { name: 'env' } })).toString('base64');
    process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS = existing;
    jest.mocked(readCachedEisConnectors).mockReturnValue({ 'eis-cached': {} });

    await ensureEvalInit('/repo', log, readFlags(['--profile', 'local']));

    expect(readCachedEisConnectors).not.toHaveBeenCalled();
    expect(process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS).toBe(existing);
  });
});

describe('resolveProfileEnvOverrides', () => {
  const log = new ToolingLog();
  const envKeys = ['EVAL_KBN_URL', 'EVAL_KBN_API_KEY', 'TRACING_ES_URL', 'TRACING_ES_API_KEY'];
  const stackKeys = ['TRACING_EXPORTERS', 'GCS_CREDENTIALS'];
  const allKeys = [...envKeys, ...stackKeys];
  const saved = Object.fromEntries(allKeys.map((key) => [key, process.env[key]]));
  const datasetsEnv = {
    EVAL_KBN_URL: 'http://elastic:changeme@localhost:5601/dev',
    EVAL_KBN_API_KEY: 'profile-kbn-key',
  };
  const exportEnv = {
    TRACING_ES_URL: 'http://elastic:changeme@localhost:9200',
    TRACING_ES_API_KEY: 'profile-es-key',
  };

  const resolve = () =>
    resolveProfileEnvOverrides({
      repoRoot: '/repo',
      log,
      flagsReader: readFlags(['--profile', 'local']),
      profile: 'local',
    });

  beforeEach(() => {
    allKeys.forEach((key) => delete process.env[key]);
    jest.mocked(envFromDatasetsProfile).mockReset().mockReturnValue(datasetsEnv);
    jest.mocked(envFromExportProfile).mockReset().mockReturnValue(exportEnv);
    jest.mocked(defaultExportProfile).mockReset();
  });

  afterEach(() => {
    allKeys.forEach((key) => {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    });
  });

  it('uses the profile values when the environment does not set them', async () => {
    const { profileEnvOverrides } = await resolve();

    expect(profileEnvOverrides).toMatchObject({
      EVAL_KBN_URL: 'http://elastic:changeme@localhost:5601/dev',
      EVAL_KBN_API_KEY: 'profile-kbn-key',
      TRACING_ES_URL: 'http://elastic:changeme@localhost:9200',
      TRACING_ES_API_KEY: 'profile-es-key',
    });
  });

  it('lets variables already exported win over the profile, key by key', async () => {
    process.env.EVAL_KBN_URL = 'https://my-kibana.example';
    process.env.TRACING_ES_URL = 'https://my-es.example';

    const { profileEnvOverrides } = await resolve();

    expect(profileEnvOverrides).toMatchObject({
      EVAL_KBN_URL: 'https://my-kibana.example',
      TRACING_ES_URL: 'https://my-es.example',
      EVAL_KBN_API_KEY: 'profile-kbn-key',
      TRACING_ES_API_KEY: 'profile-es-key',
    });
  });

  it('treats an empty exported variable as unset', async () => {
    process.env.EVAL_KBN_URL = '';

    const { profileEnvOverrides } = await resolve();

    expect(profileEnvOverrides.EVAL_KBN_URL).toBe('http://elastic:changeme@localhost:5601/dev');
  });

  it('seeds exported variables the profile does not define', async () => {
    process.env.GCS_CREDENTIALS = '{"type":"service_account"}';
    process.env.TRACING_EXPORTERS = '[{"http":{"url":"http://collector:4318/v1/traces"}}]';

    const { profileEnvOverrides } = await resolve();

    expect(profileEnvOverrides).toMatchObject({
      GCS_CREDENTIALS: '{"type":"service_account"}',
      TRACING_EXPORTERS: '[{"http":{"url":"http://collector:4318/v1/traces"}}]',
    });
  });

  it('does not probe or drop an exported TRACING_ES_URL on the auto-selected local profile', async () => {
    process.env.TRACING_ES_URL = 'http://127.0.0.1:1';
    const warning = jest.spyOn(log, 'warning').mockImplementation(() => true);
    jest.mocked(defaultExportProfile).mockReturnValue('local');
    jest.mocked(envFromExportProfile).mockReturnValue({ TRACING_ES_URL: 'http://127.0.0.1:2' });

    const { profileEnvOverrides } = await resolveProfileEnvOverrides({
      repoRoot: '/repo',
      log,
      flagsReader: readFlags([]),
    });

    expect(profileEnvOverrides.TRACING_ES_URL).toBe('http://127.0.0.1:1');
    expect(warning).not.toHaveBeenCalled();
    warning.mockRestore();
  });

  it('drops an unreachable TRACING_ES_URL that came from the auto-selected local profile', async () => {
    jest.mocked(envFromExportProfile).mockReturnValue({ TRACING_ES_URL: 'http://127.0.0.1:1' });
    const warning = jest.spyOn(log, 'warning').mockImplementation(() => true);
    jest.mocked(defaultExportProfile).mockReturnValue('local');

    const { profileEnvOverrides } = await resolveProfileEnvOverrides({
      repoRoot: '/repo',
      log,
      flagsReader: readFlags([]),
    });

    expect(profileEnvOverrides).not.toHaveProperty('TRACING_ES_URL');
    expect(warning).toHaveBeenCalledTimes(1);
    warning.mockRestore();
  });

  it('keeps an explicit --evaluations-kbn-url ahead of the profile', () => {
    const env = buildEvalRunEnv({
      evaluationConnectorId: 'judge',
      requiresEisCcm: false,
      skipServer: true,
      profileEnvOverrides: { EVAL_KBN_URL: 'http://localhost:5601/dev' },
      suiteScoutEnv: {},
      flagsReader: readFlags(['--evaluations-kbn-url', 'https://flag.example']),
      log,
    });

    expect(env.EVAL_KBN_URL).toBe('https://flag.example');
  });
});

describe('readSkipServerFlag', () => {
  it.each([
    [[], false],
    [['--skip-server'], true],
    [['--skip-server', '--suite', 'x'], true],
    [['--skip-server=true'], true],
    [['--skip-server=1'], true],
    [['--skip-server=false'], false],
    [['--skip-server=FALSE'], false],
    [['--skip-server=0'], false],
    [['--skip-server', 'false'], false],
    [['--no-skip-server'], false],
  ])('parses %j as %s', (argv, expected) => {
    expect(readSkipServerFlag(readFlags(argv))).toBe(expected);
  });

  it('rejects a value that is not a boolean', () => {
    expect(() => readSkipServerFlag(readFlags(['--skip-server=maybe']))).toThrow(
      'invalid --skip-server value "maybe"'
    );
  });

  it('rejects an empty value instead of reading it as the bare flag', () => {
    const argv = ['--skip-server='];
    expect(() => readSkipServerFlag(readFlags(argv), argv)).toThrow(
      'invalid --skip-server value ""'
    );
  });

  it('reads the red-team flag set, which extends evalRunFlags with string flags', () => {
    const redTeamFlags = {
      ...evalRunFlags,
      string: [...(evalRunFlags.string ?? []), 'modules', 'count'],
    };
    const read = (argv: string[]) =>
      readSkipServerFlag(new FlagsReader(getFlags(argv, redTeamFlags)), argv);

    expect(read(['--skip-server', '--modules', 'jailbreaking'])).toBe(true);
    expect(read(['--skip-server=true'])).toBe(true);
    expect(read(['--skip-server=false'])).toBe(false);
  });

  it('forwards a skipped server to the re-run args as a bare flag', () => {
    const args = buildEvalRunArgs({
      suiteId: 'agent-builder',
      evaluationConnectorId: 'judge',
      projects: [],
      flagsReader: readFlags(['--skip-server=true']),
      skipServer: true,
    });

    expect(args).toContain('--skip-server');
  });
});
