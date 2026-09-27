/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';

import { runSuiteCmd } from './run';
import { resolveEvalSuite } from '../run_helpers';

jest.mock('../eval_stack', () => ({
  ensureEvalStack: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@kbn/es', () => ({
  resolveCcmApiKey: jest.fn().mockResolvedValue('ccm-api-key'),
}));

const mockSpawn = jest.fn();

jest.mock('child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

jest.mock('../run_helpers', () => ({
  ...jest.requireActual('../run_helpers'),
  resolveEvalSuite: jest.fn(),
}));

const mockReadCachedEisConnectors = jest.fn<Record<string, object> | undefined, []>();
const mockGetEisCacheStatus = jest.fn<'fresh' | 'expired' | 'missing' | 'malformed', []>();

// The real cache module reads ~/.elastic, so a developer's own cache file would
// decide these tests. The guard lives in run_helpers (requiredActual above),
// which imports this module.
jest.mock('../eis_connectors_cache', () => ({
  readCachedEisConnectors: () => mockReadCachedEisConnectors(),
  getEisCacheStatus: () => mockGetEisCacheStatus(),
}));

jest.mock('../prompts', () => ({
  promptForSuite: jest.fn(),
  promptForConnector: jest.fn(),
  promptForProject: jest.fn(),
  isTTY: jest.fn().mockReturnValue(false),
  getAllAvailableConnectors: jest.fn().mockReturnValue([]),
}));

jest.mock('../profiles', () => ({
  isDevVaultProfile: jest.fn().mockReturnValue(false),
  resolveVaultConfigPath: jest.fn(),
  defaultExportProfile: jest.fn().mockReturnValue(undefined),
  envFromDatasetsProfile: jest.fn().mockReturnValue({}),
  envFromExportProfile: jest.fn().mockReturnValue({}),
  stripTrailingSlash: jest.fn((v: string) => v),
  probeHttp: jest.fn(),
  isExportProfileImplicitLocal: jest.fn().mockReturnValue(false),
}));

jest.mock('../../utils/space_ids', () => ({
  parseSpaceIds: jest.fn().mockReturnValue([]),
}));

const mockResolveEvalSuite = resolveEvalSuite as jest.MockedFunction<typeof resolveEvalSuite>;

type FlagInput = string | string[] | boolean | number;

const runEval = async (flags: Record<string, FlagInput | undefined>) => {
  const log = new ToolingLog();
  jest.spyOn(log, 'info').mockImplementation(() => undefined);
  jest.spyOn(log, 'warning');

  mockResolveEvalSuite.mockResolvedValue({
    suite: undefined,
    suiteId: 'suite',
    resolvedConfigPath: 'config.js',
  });

  await runSuiteCmd.run({
    log,
    flagsReader: new FlagsReader(flags),
    repoRoot: '/repo',
  } as never);

  return log;
};

describe('run EIS cache guard', () => {
  beforeEach(() => {
    mockReadCachedEisConnectors.mockReturnValue(undefined);
    mockGetEisCacheStatus.mockReturnValue('missing');
    delete process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    delete process.env.KIBANA_TESTING_INFERENCE_ENDPOINTS;
  });

  it('fails fast on a missing EIS cache instead of spawning Playwright', async () => {
    // `evals run` used to skip the cache guard entirely (it does not call
    // resolveEvalRunContext), so an EIS-backed run with an unusable cache fell
    // through to per-test 404s inside Playwright.
    await expect(
      runEval({
        suite: 'suite',
        'evaluation-connector-id': 'eis-test-connector',
        'skip-init': true,
        'dry-run': false,
      })
    ).rejects.toThrow(/eis-connectors-cache\.json is missing/);

    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('exports a fresh complete cache for the Playwright child', async () => {
    const connectors = {
      'eis-test-connector': {
        name: 'EIS test connector',
        inferenceId: '.eis-test-connector',
        provider: 'elastic',
        taskType: 'chat_completion',
      },
    };
    mockReadCachedEisConnectors.mockReturnValue(connectors);
    mockSpawn.mockImplementation(() => {
      const handlers: Record<string, Array<(arg?: unknown) => void>> = {};
      const child = {
        on: (event: string, cb: (arg?: unknown) => void) => {
          (handlers[event] ??= []).push(cb);
          return child;
        },
        emit: (event: string, arg?: unknown) => {
          (handlers[event] ?? []).forEach((cb) => cb(arg));
        },
      };
      setImmediate(() => child.emit('exit', 0));
      return child;
    });

    await runEval({
      suite: 'suite',
      'evaluation-connector-id': 'eis-test-connector',
      'skip-init': true,
      'dry-run': false,
    });

    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });

  it('warns instead of throwing for a dry run with an unusable cache', async () => {
    const log = await runEval({
      suite: 'suite',
      'evaluation-connector-id': 'eis-test-connector',
      'skip-init': true,
      'dry-run': true,
    });

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Continuing because this is a dry run')
    );
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('does not run the guard for a non-EIS judge', async () => {
    mockSpawn.mockImplementation(() => {
      const child = {
        on: (event: string, cb: (arg?: unknown) => void) => {
          if (event === 'exit') {
            setImmediate(() => cb(0));
          }
          return child;
        },
      };
      return child;
    });

    await runEval({
      suite: 'suite',
      'evaluation-connector-id': 'local-judge',
      'skip-init': true,
      'dry-run': false,
    });

    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });
});
