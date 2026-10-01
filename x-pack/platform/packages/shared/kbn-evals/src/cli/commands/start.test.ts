/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlagsReader } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';

import { startCmd } from './start';
import { resolveEvalRunContext } from '../run_helpers';

jest.mock('../eval_stack', () => ({
  ensureEvalStack: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@kbn/es', () => ({
  resolveCcmApiKey: jest.fn().mockResolvedValue('ccm-api-key'),
}));

// A non-dry run reaches the Playwright spawn; stub it so the test never shells out.
jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
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
  }),
}));

jest.mock('../run_helpers', () => ({
  ...jest.requireActual('../run_helpers'),
  ensureEvalInit: jest.fn().mockResolvedValue(undefined),
  resolveEvalSuite: jest
    .fn()
    .mockResolvedValue({ suite: undefined, suiteId: 'suite', resolvedConfigPath: 'config.js' }),
  resolveEvalRunContext: jest.fn(),
}));

const mockResolveEvalRunContext = resolveEvalRunContext as jest.MockedFunction<
  typeof resolveEvalRunContext
>;

type FlagInput = string | string[] | boolean | number;

const runStart = async (flags: Record<string, FlagInput | undefined>) => {
  const log = new ToolingLog();
  jest.spyOn(log, 'info').mockImplementation(() => undefined);

  mockResolveEvalRunContext.mockResolvedValue({
    evaluationConnectorId: 'eis-test-connector',
    projects: [],
    profileEnvOverrides: {},
    suiteScoutEnv: {},
    requiresEisCcm: true,
  });

  await startCmd.run({ log, flagsReader: new FlagsReader(flags) } as never);

  return mockResolveEvalRunContext.mock.calls[0][0];
};

describe('start --dry-run cache guard wiring', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('tells run-context resolution that this is a dry run', async () => {
    // Without this the guard aborted `start --dry-run` before it could print the
    // re-run command, even though a dry run starts nothing.
    const options = await runStart({ 'dry-run': true, 'skip-server': false, suite: 'suite' });

    expect(options).toMatchObject({ dryRun: true });
  });

  it('does not mark a real run as a dry run', async () => {
    const options = await runStart({ 'dry-run': false, 'skip-server': false, suite: 'suite' });

    expect(options).toMatchObject({ dryRun: false });
  });
});
