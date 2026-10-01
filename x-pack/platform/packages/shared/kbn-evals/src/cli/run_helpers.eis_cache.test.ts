/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';

import { resolveEvalRunContext, ensureEvalInit } from './run_helpers';

const mockReadCachedEisConnectors = jest.fn<Record<string, object> | undefined, []>();
const mockGetEisCacheStatus = jest.fn<'fresh' | 'expired' | 'missing' | 'malformed', []>();
const mockGetAllAvailableConnectors = jest.fn<
  Array<{ id: string; name: string; source: string }>,
  [string]
>();

jest.mock('./eis_connectors_cache', () => ({
  readCachedEisConnectors: () => mockReadCachedEisConnectors(),
  getEisCacheStatus: () => mockGetEisCacheStatus(),
}));

jest.mock('./prompts', () => ({
  promptForSuite: jest.fn(),
  promptForConnector: jest.fn(),
  promptForProject: jest.fn(),
  isTTY: jest.fn().mockReturnValue(false),
  getAllAvailableConnectors: (repoRoot: string) => mockGetAllAvailableConnectors(repoRoot),
}));

jest.mock('./commands/init', () => ({
  runConfigInit: jest.fn(),
  runConnectorSetup: jest.fn(),
  ensureVaultAuth: jest.fn(),
  ensureLocalConfig: jest.fn(),
}));

jest.mock('./profiles', () => ({
  isDevVaultProfile: jest.fn().mockReturnValue(false),
  resolveVaultConfigPath: jest.fn(),
  defaultExportProfile: jest.fn().mockReturnValue(undefined),
  envFromDatasetsProfile: jest.fn().mockReturnValue({}),
  envFromExportProfile: jest.fn().mockReturnValue({}),
  stripTrailingSlash: jest.fn((v: string) => v),
  probeHttp: jest.fn(),
  isExportProfileImplicitLocal: jest.fn().mockReturnValue(false),
}));

jest.mock('../utils/space_ids', () => ({
  parseSpaceIds: jest.fn().mockReturnValue([]),
}));

describe('resolveEvalRunContext EIS cache guard', () => {
  let log: ToolingLog;

  const buildFlagsReader = () =>
    new FlagsReader({ 'evaluation-connector-id': 'eis-test-connector' });

  const call = () =>
    resolveEvalRunContext({ repoRoot: '/repo', log, flagsReader: buildFlagsReader() });

  beforeEach(() => {
    log = new ToolingLog();
    jest.spyOn(log, 'info');
    jest.spyOn(log, 'warning');
    delete process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;
    mockGetAllAvailableConnectors.mockReturnValue([
      { id: 'eis-test-connector', name: 'EIS test connector', source: 'env' },
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;
  });

  it('throws a clear flag error when the cache is missing and env var unset', async () => {
    mockReadCachedEisConnectors.mockReturnValue(undefined);
    mockGetEisCacheStatus.mockReturnValue('missing');

    await expect(call()).rejects.toThrow(
      /eis-connectors-cache\.json is missing[\s\S]*node scripts\/evals init/
    );
  });

  it('names expiry explicitly when the cache is past the 7-day TTL', async () => {
    mockReadCachedEisConnectors.mockReturnValue(undefined);
    mockGetEisCacheStatus.mockReturnValue('expired');

    await expect(call()).rejects.toThrow(/is expired \(>7 days old\)/);
  });

  it('loads endpoints from a fresh cache that defines the required connector', async () => {
    const connectors = { 'eis-test-connector': { inferenceId: 'test' } };
    mockReadCachedEisConnectors.mockReturnValue(connectors);

    await call();

    expect(process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS).toEqual(
      Buffer.from(JSON.stringify(connectors)).toString('base64')
    );
    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining('EIS connectors loaded from cache')
    );
  });

  it('refuses a fresh cache that does not define the connector the run needs', async () => {
    // The regression this guards: a present, in-TTL cache that simply lacks the
    // requested connector id used to be exported anyway, so every inference
    // call 404'd with the cache reported as healthy.
    mockReadCachedEisConnectors.mockReturnValue({ 'eis-something-else': { inferenceId: 'x' } });
    mockGetEisCacheStatus.mockReturnValue('fresh');

    await expect(call()).rejects.toThrow(/eis-test-connector/);
    await expect(call()).rejects.toThrow(/does not define every connector this run needs/);
    expect(process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS).toBeUndefined();
  });

  it('does not touch the env var when it is already set', async () => {
    process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS = 'provided';
    mockReadCachedEisConnectors.mockReturnValue(undefined);
    mockGetEisCacheStatus.mockReturnValue('missing');

    await call();

    expect(process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS).toBe('provided');
  });

  it('checks the required ids when the payload was exported from the cache', async () => {
    // Interactive `start` runs ensureEvalInit first, which exports a fresh cache
    // into KIBANA_TESTING_INFERENCE_ENDPOINTS. Resolving the run context then saw
    // "env var is set" and skipped the required-id check entirely, so an
    // incomplete cache still produced per-test 404s.
    process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS = Buffer.from(
      JSON.stringify({ 'eis-something-else': { inferenceId: 'x' } })
    ).toString('base64');

    await expect(call()).rejects.toThrow(/does not define eis-test-connector/);
  });

  it('accepts an env payload that defines every required connector', async () => {
    const connectors = { 'eis-test-connector': { inferenceId: 'test' } };
    process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS = Buffer.from(
      JSON.stringify(connectors)
    ).toString('base64');

    await expect(call()).resolves.toMatchObject({
      evaluationConnectorId: 'eis-test-connector',
      requiresEisCcm: true,
    });
  });

  it('does not require the cache for an eis-* id that is a preconfigured kibana.dev.yml connector', async () => {
    // Regression: a connector already registered via `xpack.actions.preconfigured`
    // in kibana.dev.yml is served directly by Kibana, with no dependency on
    // KIBANA_TESTING_INFERENCE_ENDPOINTS or the EIS connectors cache. Because
    // "eis-" is only a naming convention, the guard used to treat it the same
    // as a real EIS connector and reject the run for a cache that was never
    // going to be needed.
    mockGetAllAvailableConnectors.mockReturnValue([
      { id: 'eis-my-preconfigured-connector', name: 'Preconfigured', source: 'kibana.dev.yml' },
    ]);
    mockReadCachedEisConnectors.mockReturnValue(undefined);
    mockGetEisCacheStatus.mockReturnValue('missing');

    await expect(
      resolveEvalRunContext({
        repoRoot: '/repo',
        log,
        flagsReader: new FlagsReader({
          'evaluation-connector-id': 'eis-my-preconfigured-connector',
        }),
      })
    ).resolves.toMatchObject({
      evaluationConnectorId: 'eis-my-preconfigured-connector',
      requiresEisCcm: false,
    });
  });

  it('leaves an unparseable env payload to loadInferenceEndpoints to reject', async () => {
    process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS = 'provided';

    await expect(call()).resolves.toMatchObject({
      evaluationConnectorId: 'eis-test-connector',
    });
  });

  it('warns instead of throwing for a dry run with an unusable cache', async () => {
    // `start --dry-run` starts no server and runs no Playwright: it only prints
    // the invocation, so a missing cache must not abort the preview.
    mockReadCachedEisConnectors.mockReturnValue(undefined);
    mockGetEisCacheStatus.mockReturnValue('missing');

    await expect(
      resolveEvalRunContext({
        repoRoot: '/repo',
        log,
        flagsReader: buildFlagsReader(),
        dryRun: true,
      })
    ).resolves.toMatchObject({ evaluationConnectorId: 'eis-test-connector' });

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Continuing because this is a dry run')
    );
    expect(process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS).toBeUndefined();
  });

  it('warns instead of throwing for a dry run with an incomplete cache', async () => {
    mockReadCachedEisConnectors.mockReturnValue({ 'eis-something-else': { inferenceId: 'x' } });
    mockGetEisCacheStatus.mockReturnValue('fresh');

    await expect(
      resolveEvalRunContext({
        repoRoot: '/repo',
        log,
        flagsReader: buildFlagsReader(),
        dryRun: true,
      })
    ).resolves.toMatchObject({ evaluationConnectorId: 'eis-test-connector' });

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Continuing because this is a dry run')
    );
  });

  it('warns instead of throwing for a dry run whose payload lacks a required id', async () => {
    process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS = Buffer.from(
      JSON.stringify({ 'eis-something-else': { inferenceId: 'x' } })
    ).toString('base64');

    await expect(
      resolveEvalRunContext({
        repoRoot: '/repo',
        log,
        flagsReader: buildFlagsReader(),
        dryRun: true,
      })
    ).resolves.toMatchObject({ evaluationConnectorId: 'eis-test-connector' });

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Continuing because this is a dry run')
    );
  });
});

describe('ensureEvalInit zero-connectors rejection', () => {
  let log: ToolingLog;

  beforeEach(() => {
    log = new ToolingLog();
    jest.spyOn(log, 'info').mockImplementation(() => undefined);
    delete process.env.EVAL_CONNECTOR_ID;
    mockGetAllAvailableConnectors.mockReturnValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.EVAL_CONNECTOR_ID;
  });

  it('still rejects a non-EIS run with no connectors available', async () => {
    await expect(
      ensureEvalInit('/repo', log, new FlagsReader({ profile: 'local', 'skip-init': false }))
    ).rejects.toThrow(/No connectors available/);
  });

  it('defers the rejection to the cache guard for an explicit eis-* judge', async () => {
    // `ensureEvalInit` used to throw "No connectors available" before the cache
    // guard could run, so the advertised cache-state diagnostic (which names the
    // connector and the repair command) was unreachable exactly when it mattered.
    await expect(
      ensureEvalInit(
        '/repo',
        log,
        new FlagsReader({
          profile: 'local',
          'evaluation-connector-id': 'eis-test-connector',
          'skip-init': false,
        })
      )
    ).resolves.toBe('local');
  });

  it('defers the rejection when the eis-* judge comes from the environment', async () => {
    process.env.EVAL_CONNECTOR_ID = 'eis-test-connector';

    await expect(
      ensureEvalInit('/repo', log, new FlagsReader({ profile: 'local', 'skip-init': false }))
    ).resolves.toBe('local');
  });
});
