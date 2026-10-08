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
  evalRunFlags,
  readConcurrencyFlag,
  resolveEvaluationConnectorId,
} from './run_helpers';
import { getAllAvailableConnectors, isTTY, promptForConnector } from './prompts';
import { resolveDefaultJudgeConnectorId } from './profiles';

jest.mock('./prompts', () => ({
  ...jest.requireActual('./prompts'),
  isTTY: jest.fn(),
  promptForConnector: jest.fn(),
  getAllAvailableConnectors: jest.fn(),
}));

jest.mock('./profiles', () => ({
  ...jest.requireActual('./profiles'),
  resolveDefaultJudgeConnectorId: jest.fn(),
}));

const readFlags = (argv: string[]): FlagsReader => new FlagsReader(getFlags(argv, evalRunFlags));

describe('resolveEvaluationConnectorId', () => {
  const repoRoot = '/repo';
  const log = new ToolingLog();
  const previous = process.env.EVAL_CONNECTOR_ID;
  const connector = (id: string) => ({ id, name: id, source: 'env' as const });
  const DEFAULT_JUDGE = 'eis-default-judge';

  beforeEach(() => {
    delete process.env.EVAL_CONNECTOR_ID;
    jest.mocked(isTTY).mockReturnValue(false);
    jest.mocked(promptForConnector).mockReset();
    jest.mocked(getAllAvailableConnectors).mockReturnValue([]);
    jest.mocked(resolveDefaultJudgeConnectorId).mockReturnValue(DEFAULT_JUDGE);
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.EVAL_CONNECTOR_ID;
    } else {
      process.env.EVAL_CONNECTOR_ID = previous;
    }
  });

  it('uses --judge when passed', async () => {
    process.env.EVAL_CONNECTOR_ID = 'from-env';
    await expect(
      resolveEvaluationConnectorId(repoRoot, log, readFlags(['--judge', 'from-flag']))
    ).resolves.toBe('from-flag');
  });

  it('uses EVAL_CONNECTOR_ID when no flag is passed', async () => {
    process.env.EVAL_CONNECTOR_ID = 'from-env';
    await expect(resolveEvaluationConnectorId(repoRoot, log, readFlags([]))).resolves.toBe(
      'from-env'
    );
  });

  it('prompts with the profile default judge pre-selected on a TTY', async () => {
    jest.mocked(isTTY).mockReturnValue(true);
    jest.mocked(promptForConnector).mockResolvedValue('picked');

    await expect(
      resolveEvaluationConnectorId(repoRoot, log, readFlags([]), 'dev-vault')
    ).resolves.toBe('picked');
    expect(resolveDefaultJudgeConnectorId).toHaveBeenCalledWith(repoRoot, 'dev-vault');
    expect(promptForConnector).toHaveBeenCalledWith(repoRoot, log, undefined, DEFAULT_JUDGE);
  });

  it('prompts without a pre-selection on a TTY when the profile has no default judge', async () => {
    jest.mocked(isTTY).mockReturnValue(true);
    jest.mocked(resolveDefaultJudgeConnectorId).mockReturnValue(undefined);
    jest.mocked(promptForConnector).mockResolvedValue('picked');

    await expect(resolveEvaluationConnectorId(repoRoot, log, readFlags([]))).resolves.toBe(
      'picked'
    );
    expect(promptForConnector).toHaveBeenCalledWith(repoRoot, log, undefined, undefined);
  });

  it('uses the profile default judge without prompting when there is no TTY', async () => {
    jest
      .mocked(getAllAvailableConnectors)
      .mockReturnValue([connector('other'), connector(DEFAULT_JUDGE)]);

    await expect(resolveEvaluationConnectorId(repoRoot, log, readFlags([]))).resolves.toBe(
      DEFAULT_JUDGE
    );
    expect(promptForConnector).not.toHaveBeenCalled();
  });

  it('fails without a TTY when the profile has no default judge', async () => {
    jest.mocked(resolveDefaultJudgeConnectorId).mockReturnValue(undefined);

    await expect(resolveEvaluationConnectorId(repoRoot, log, readFlags([]))).rejects.toThrow(
      'EVAL_CONNECTOR_ID is required'
    );
  });

  it('fails without a TTY when the profile default judge is not an available connector', async () => {
    jest.mocked(getAllAvailableConnectors).mockReturnValue([connector('other')]);

    await expect(resolveEvaluationConnectorId(repoRoot, log, readFlags([]))).rejects.toThrow(
      `Default judge ${DEFAULT_JUDGE} (from the profile config) is not among the available connectors`
    );
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
