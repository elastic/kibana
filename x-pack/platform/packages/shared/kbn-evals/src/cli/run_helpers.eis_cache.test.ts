/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';

import { resolveEvalRunContext } from './run_helpers';

const mockReadCachedEisConnectors = jest.fn<Record<string, object> | undefined, []>();
const mockGetEisCacheStatus = jest.fn<'fresh' | 'expired' | 'missing' | 'malformed', []>();

jest.mock('./eis_connectors_cache', () => ({
  readCachedEisConnectors: () => mockReadCachedEisConnectors(),
  getEisCacheStatus: () => mockGetEisCacheStatus(),
}));

jest.mock('./prompts', () => ({
  promptForSuite: jest.fn(),
  promptForConnector: jest.fn(),
  promptForProject: jest.fn(),
  isTTY: jest.fn().mockReturnValue(false),
  getAllAvailableConnectors: jest
    .fn()
    .mockReturnValue([{ id: 'eis-test-connector', name: 'EIS test connector' }]),
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
    delete process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;
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

  it('loads endpoints from a fresh cache', async () => {
    const connectors = { 'eis-x': { inferenceId: 'x' } };
    mockReadCachedEisConnectors.mockReturnValue(connectors);

    await call();

    expect(process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS).toEqual(
      Buffer.from(JSON.stringify(connectors)).toString('base64')
    );
    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining('EIS connectors loaded from cache')
    );
  });

  it('does not touch the env var when it is already set', async () => {
    process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS = 'provided';
    mockReadCachedEisConnectors.mockReturnValue(undefined);
    mockGetEisCacheStatus.mockReturnValue('missing');

    await call();

    expect(process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS).toBe('provided');
  });
});
