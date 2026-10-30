/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlagsReader, getFlags } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { ensureEvalStack } from '@kbn/evals';
import { redTeamCmd } from './red_team';

jest.mock('@kbn/evals', () => ({
  ...jest.requireActual('@kbn/evals'),
  ensureEvalInit: jest.fn().mockResolvedValue('local'),
  resolveEvalSuite: jest.fn().mockResolvedValue({ suiteId: 'agent-builder', suite: undefined }),
  resolveEvalRunContext: jest.fn().mockResolvedValue({
    evaluationConnectorId: 'judge',
    projects: [],
    profileEnvOverrides: {},
    suiteScoutEnv: {},
    requiresEisCcm: false,
  }),
  ensureEvalStack: jest.fn(),
}));

const runRedTeam = async (argv: string[]): Promise<string[]> => {
  const log = new ToolingLog();
  const infoSpy = jest.spyOn(log, 'info').mockImplementation(() => true);
  const flagsReader = new FlagsReader(getFlags(argv, redTeamCmd.flags ?? {}));

  await redTeamCmd.run({ log, flagsReader } as unknown as Parameters<typeof redTeamCmd.run>[0]);

  const lines = infoSpy.mock.calls.map(([message]) => String(message));
  infoSpy.mockRestore();
  return lines;
};

describe('red-team --skip-server', () => {
  beforeEach(() => {
    jest.mocked(ensureEvalStack).mockReset();
  });

  it.each([
    [['--suite', 'agent-builder', '--dry-run', '--skip-server'], 'skip (using existing)'],
    [['--suite', 'agent-builder', '--dry-run', '--skip-server=true'], 'skip (using existing)'],
    [['--suite', 'agent-builder', '--dry-run', '--skip-server=false'], 'managed'],
    [['--suite', 'agent-builder', '--dry-run'], 'managed'],
  ])('parses %j without a flag error', async (argv, expectedServer) => {
    const lines = await runRedTeam(argv);

    expect(lines).toContain(`Server:    ${expectedServer}`);
    expect(ensureEvalStack).not.toHaveBeenCalled();
  });
});
