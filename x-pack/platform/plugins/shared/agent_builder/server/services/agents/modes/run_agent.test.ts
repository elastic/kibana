/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAgentHandlerContextMock } from '../../../test_utils/runner';
import { runAgent } from './run_agent';
import { runDefaultAgentMode } from './default';
import { runPlanningAgentMode } from './planning';

jest.mock('./default', () => ({
  runDefaultAgentMode: jest.fn().mockResolvedValue({ round: {} }),
}));
jest.mock('./planning', () => ({
  runPlanningAgentMode: jest.fn().mockResolvedValue({ round: {} }),
}));

const runDefaultAgentModeMock = runDefaultAgentMode as jest.MockedFn<typeof runDefaultAgentMode>;
const runPlanningAgentModeMock = runPlanningAgentMode as jest.MockedFn<typeof runPlanningAgentMode>;

const DEFAULT_PARAMS = {
  nextInput: { message: 'test', attachments: [] },
  agentConfiguration: { tools: [] } as any,
};

describe('runAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mode routing (13.6)', () => {
    it('calls runDefaultAgentMode when agentMode is "agent"', async () => {
      const context = createAgentHandlerContextMock();
      await runAgent({ ...DEFAULT_PARAMS, agentMode: 'agent' }, context);

      expect(runDefaultAgentModeMock).toHaveBeenCalledWith(
        { ...DEFAULT_PARAMS, agentMode: 'agent' },
        context
      );
      expect(runPlanningAgentModeMock).not.toHaveBeenCalled();
    });

    it('calls runDefaultAgentMode when agentMode is undefined (defaults to "agent")', async () => {
      const context = createAgentHandlerContextMock();
      await runAgent(DEFAULT_PARAMS, context);

      expect(runDefaultAgentModeMock).toHaveBeenCalledWith(DEFAULT_PARAMS, context);
      expect(runPlanningAgentModeMock).not.toHaveBeenCalled();
    });

    it('calls runPlanningAgentMode when agentMode is "planning" (with planning enabled)', async () => {
      const context = createAgentHandlerContextMock();
      context.experimentalFeatures.planning = true;

      await runAgent({ ...DEFAULT_PARAMS, agentMode: 'planning' }, context);

      expect(runPlanningAgentModeMock).toHaveBeenCalledWith(
        { ...DEFAULT_PARAMS, agentMode: 'planning' },
        context
      );
      expect(runDefaultAgentModeMock).not.toHaveBeenCalled();
    });
  });

  describe('feature flag gating (13.13)', () => {
    it('throws error when agentMode is "planning" but experimentalFeatures.planning is false', async () => {
      const context = createAgentHandlerContextMock();
      context.experimentalFeatures.planning = false;

      await expect(runAgent({ ...DEFAULT_PARAMS, agentMode: 'planning' }, context)).rejects.toThrow(
        'Planning mode is not available. Enable experimental features in the agent builder settings.'
      );

      expect(runPlanningAgentModeMock).not.toHaveBeenCalled();
      expect(runDefaultAgentModeMock).not.toHaveBeenCalled();
    });

    it('does NOT throw when agentMode is "agent" regardless of experimentalFeatures.planning', async () => {
      const context = createAgentHandlerContextMock();
      context.experimentalFeatures.planning = false;

      await expect(runAgent({ ...DEFAULT_PARAMS, agentMode: 'agent' }, context)).resolves.toEqual({
        round: {},
      });

      expect(runDefaultAgentModeMock).toHaveBeenCalled();
      expect(runPlanningAgentModeMock).not.toHaveBeenCalled();
    });

    it('does NOT throw when agentMode is "planning" and experimentalFeatures.planning is true', async () => {
      const context = createAgentHandlerContextMock();
      context.experimentalFeatures.planning = true;

      await expect(
        runAgent({ ...DEFAULT_PARAMS, agentMode: 'planning' }, context)
      ).resolves.toEqual({ round: {} });

      expect(runPlanningAgentModeMock).toHaveBeenCalled();
      expect(runDefaultAgentModeMock).not.toHaveBeenCalled();
    });
  });
});
