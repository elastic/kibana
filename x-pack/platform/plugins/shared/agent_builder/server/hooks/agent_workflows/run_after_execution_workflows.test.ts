/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  type ConversationRound,
} from '@kbn/agent-builder-common';
import { ExecutionStatus } from '@kbn/workflows';
import { runAfterExecutionWorkflows } from './run_after_execution_workflows';
import { executeWorkflow } from '@kbn/agent-builder-tools-base/workflows';
import { getCurrentSpaceId } from '../../utils/spaces';

jest.mock('@kbn/agent-builder-tools-base/workflows', () => ({
  executeWorkflow: jest.fn(),
}));

jest.mock('../../utils/spaces', () => ({
  getCurrentSpaceId: jest.fn(() => 'default'),
}));

const executeWorkflowMock = jest.mocked(executeWorkflow);
const getCurrentSpaceIdMock = jest.mocked(getCurrentSpaceId);

type RunAfterExecutionWorkflowsParams = Parameters<typeof runAfterExecutionWorkflows>[0];
type WorkflowApi = RunAfterExecutionWorkflowsParams['workflowApi'];
type GetInternalServices = RunAfterExecutionWorkflowsParams['getInternalServices'];

const makeRound = (overrides: Partial<ConversationRound> = {}): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'hello' },
  response: { message: 'hi' },
  steps: [],
  started_at: '2026-01-01T00:00:00.000Z',
  time_to_first_token: 100,
  time_to_last_token: 200,
  model_usage: { connector_id: 'connector-1', llm_calls: 1, input_tokens: 10, output_tokens: 5 },
  ...overrides,
});

describe('runAfterExecutionWorkflows', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();

  const createDeps = ({ uiEnabled = true }: { uiEnabled?: boolean } = {}) => {
    const savedObjects = savedObjectsServiceMock.createStartContract();
    const uiSettings = uiSettingsServiceMock.createStartContract();
    const uiSettingsClient = uiSettingsServiceMock.createClient();
    uiSettingsClient.get.mockResolvedValue(uiEnabled);
    const soClient = savedObjects.createInternalRepository();
    savedObjects.getScopedClient.mockReturnValue(soClient);
    uiSettings.asScopedToClient.mockReturnValue(uiSettingsClient);

    return {
      workflowApi: {} as WorkflowApi,
      getInternalServices: jest.fn(() => ({
        spaces: {},
        uiSettings,
        savedObjects,
      })) as unknown as GetInternalServices,
    };
  };

  const createContext = (
    overrides: Partial<RunAfterExecutionWorkflowsParams['context']> = {}
  ): RunAfterExecutionWorkflowsParams['context'] => ({
    request,
    round: makeRound(),
    agentConfiguration: { tools: [], post_execution_workflow_ids: ['wf-1'] },
    agentId: 'agent-1',
    conversationId: 'conv-1',
    ...overrides,
  });

  const completedExecution = {
    execution_id: 'exec-1',
    status: ExecutionStatus.COMPLETED,
    workflow_id: 'wf-1',
    workflow_name: 'Workflow One',
    started_at: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentSpaceIdMock.mockReturnValue('default');
    executeWorkflowMock.mockResolvedValue({ success: true, execution: completedExecution });
  });

  describe('early-exit guards', () => {
    it('does nothing when post_execution_workflow_ids is empty', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      const context = createContext({
        agentConfiguration: { tools: [], post_execution_workflow_ids: [] },
      });

      await runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger });

      expect(executeWorkflowMock).not.toHaveBeenCalled();
    });

    it('does nothing when post_execution_workflow_ids is undefined', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      const context = createContext({
        agentConfiguration: { tools: [] },
      });

      await runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger });

      expect(executeWorkflowMock).not.toHaveBeenCalled();
    });

    it('does nothing when round status is in_progress', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      const context = createContext({
        round: makeRound({ status: ConversationRoundStatus.inProgress }),
      });

      await runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger });

      expect(executeWorkflowMock).not.toHaveBeenCalled();
    });

    it('does nothing when round status is awaiting_prompt', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      const context = createContext({
        round: makeRound({ status: ConversationRoundStatus.awaitingPrompt }),
      });

      await runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger });

      expect(executeWorkflowMock).not.toHaveBeenCalled();
    });

    it('does nothing when the workflows UI setting is disabled', async () => {
      const { workflowApi, getInternalServices } = createDeps({ uiEnabled: false });

      await runAfterExecutionWorkflows({
        context: createContext(),
        workflowApi,
        getInternalServices,
        logger,
      });

      expect(executeWorkflowMock).not.toHaveBeenCalled();
    });
  });

  describe('workflow params', () => {
    it('passes prompt, response, round_id, agent_id, conversation_id, and tool_calls', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      const round = makeRound({
        input: { message: 'my question' },
        response: { message: 'my answer' },
      });
      const context = createContext({ round, agentId: 'ag-1', conversationId: 'cv-1' });

      await runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger });

      expect(executeWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'wf-1',
          workflowParams: expect.objectContaining({
            prompt: 'my question',
            response: 'my answer',
            round_id: 'round-1',
            agent_id: 'ag-1',
            conversation_id: 'cv-1',
            tool_calls: [],
          }),
        })
      );
    });

    it('omits agent_id and conversation_id when undefined', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      const context = createContext({ agentId: undefined, conversationId: undefined });

      await runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger });

      const params = executeWorkflowMock.mock.calls[0][0].workflowParams as Record<string, unknown>;
      expect(params).not.toHaveProperty('agent_id');
      expect(params).not.toHaveProperty('conversation_id');
    });

    it('extracts tool_calls from round steps', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      const toolCallStep = {
        type: ConversationRoundStepType.toolCall,
        tool_id: 'my-tool',
        tool_call_id: 'tc-1',
        params: { key: 'val' },
        result: null,
        progress_messages: [],
      };
      const reasoningStep = {
        type: ConversationRoundStepType.reasoning,
        content: 'thinking...',
      };
      const round = makeRound({ steps: [toolCallStep, reasoningStep] as any });

      await runAfterExecutionWorkflows({
        context: createContext({ round }),
        workflowApi,
        getInternalServices,
        logger,
      });

      const params = executeWorkflowMock.mock.calls[0][0].workflowParams as Record<string, unknown>;
      expect(params.tool_calls).toEqual([
        { tool_id: 'my-tool', tool_call_id: 'tc-1', params: { key: 'val' } },
      ]);
    });
  });

  describe('error handling (non-throwing — fire-and-forget)', () => {
    it('logs an error and continues when executeWorkflow returns success: false', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      executeWorkflowMock.mockResolvedValueOnce({ success: false, error: 'Network error' });
      executeWorkflowMock.mockResolvedValueOnce({
        success: true,
        execution: { ...completedExecution, workflow_id: 'wf-2' },
      });
      const context = createContext({
        agentConfiguration: { tools: [], post_execution_workflow_ids: ['wf-1', 'wf-2'] },
      });

      await expect(
        runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger })
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('wf-1'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Network error'));
      expect(executeWorkflowMock).toHaveBeenCalledTimes(2);
    });

    it('logs an error and continues when execution status is FAILED', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      executeWorkflowMock.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-fail',
          status: ExecutionStatus.FAILED,
          workflow_id: 'wf-1',
          workflow_name: 'Workflow One',
          started_at: '2026-01-01T00:00:00.000Z',
          error_message: 'Step crashed',
        },
      });

      await expect(
        runAfterExecutionWorkflows({
          context: createContext(),
          workflowApi,
          getInternalServices,
          logger,
        })
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Workflow One'));
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Step crashed'));
    });

    it('uses workflow_id as fallback name when workflow_name is absent', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      executeWorkflowMock.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-fail',
          status: ExecutionStatus.FAILED,
          workflow_id: 'wf-1',
          started_at: '2026-01-01T00:00:00.000Z',
        },
      });

      await runAfterExecutionWorkflows({
        context: createContext(),
        workflowApi,
        getInternalServices,
        logger,
      });

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('wf-1'));
    });

    it('uses "unknown error" when FAILED execution has no error_message', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      executeWorkflowMock.mockResolvedValue({
        success: true,
        execution: {
          execution_id: 'exec-fail',
          status: ExecutionStatus.FAILED,
          workflow_id: 'wf-1',
          started_at: '2026-01-01T00:00:00.000Z',
        },
      });

      await runAfterExecutionWorkflows({
        context: createContext(),
        workflowApi,
        getInternalServices,
        logger,
      });

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('unknown error'));
    });
  });

  describe('successful execution', () => {
    it('logs at debug level on success', async () => {
      const { workflowApi, getInternalServices } = createDeps();

      await runAfterExecutionWorkflows({
        context: createContext(),
        workflowApi,
        getInternalServices,
        logger,
      });

      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('wf-1'));
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('exec-1'));
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('executes all workflow IDs in order', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      executeWorkflowMock
        .mockResolvedValueOnce({
          success: true,
          execution: { ...completedExecution, workflow_id: 'wf-a', execution_id: 'ea' },
        })
        .mockResolvedValueOnce({
          success: true,
          execution: { ...completedExecution, workflow_id: 'wf-b', execution_id: 'eb' },
        });

      const context = createContext({
        agentConfiguration: { tools: [], post_execution_workflow_ids: ['wf-a', 'wf-b'] },
      });

      await runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger });

      expect(executeWorkflowMock).toHaveBeenCalledTimes(2);
      expect(executeWorkflowMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ workflowId: 'wf-a' })
      );
      expect(executeWorkflowMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ workflowId: 'wf-b' })
      );
    });

    it('calls executeWorkflow with waitForCompletion: true', async () => {
      const { workflowApi, getInternalServices } = createDeps();

      await runAfterExecutionWorkflows({
        context: createContext(),
        workflowApi,
        getInternalServices,
        logger,
      });

      expect(executeWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({ waitForCompletion: true })
      );
    });
  });
});
