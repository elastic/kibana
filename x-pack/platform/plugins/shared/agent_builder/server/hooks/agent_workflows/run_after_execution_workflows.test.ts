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
  ToolResultType,
  type ConversationRound,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import { ExecutionStatus } from '@kbn/workflows';
import {
  MAX_TOOL_RESULT_ARRAY_ITEMS,
  MAX_TOOL_RESULT_DATA_CHARS,
  MAX_TOOL_RESULT_STRING_CHARS,
  runAfterExecutionWorkflows,
} from './run_after_execution_workflows';
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
type Workflow = NonNullable<Awaited<ReturnType<WorkflowApi['getWorkflow']>>>;

const makeWorkflow = (inputs?: Record<string, unknown>): Workflow =>
  ({
    definition: {
      triggers: [
        {
          type: 'manual',
          ...(inputs ? { inputs } : {}),
        },
      ],
    },
  } as unknown as Workflow);

const existingWorkflowInputs = {
  additionalProperties: false,
  properties: {
    prompt: { type: 'string' },
    response: { type: 'string' },
    conversation_id: { type: 'string' },
    round_id: { type: 'string' },
    agent_id: { type: 'string' },
    tool_calls: { type: 'array' },
  },
};

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

  const strictDefinition = (inputNames: string[]) => ({
    triggers: [
      {
        type: 'manual',
        inputs: {
          properties: Object.fromEntries(inputNames.map((name) => [name, { type: 'string' }])),
          additionalProperties: false,
        },
      },
    ],
  });
  const legacyInputNames = [
    'prompt',
    'response',
    'conversation_id',
    'round_id',
    'agent_id',
    'tool_calls',
  ];

  const createDeps = ({
    uiEnabled = true,
    definition = strictDefinition([...legacyInputNames, 'round_connector_id', 'workflow_context']),
  }: { uiEnabled?: boolean; definition?: unknown } = {}) => {
    const getWorkflow = jest.fn().mockResolvedValue({ definition });
    const savedObjects = savedObjectsServiceMock.createStartContract();
    const uiSettings = uiSettingsServiceMock.createStartContract();
    const uiSettingsClient = uiSettingsServiceMock.createClient();
    uiSettingsClient.get.mockResolvedValue(uiEnabled);
    const soClient = savedObjects.createInternalRepository();
    savedObjects.getScopedClient.mockReturnValue(soClient);
    uiSettings.asScopedToClient.mockReturnValue(uiSettingsClient);

    return {
      workflowApi: { getWorkflow } as unknown as WorkflowApi,
      getWorkflow,
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
    it('passes prompt, response, ids, round_connector_id, workflow_context, and tool_calls', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      const workflowContext = {
        'nightshift.semantic_memory.recall': {
          version: 1,
          data: { recalled_ids: ['memory-1', 'memory-2'] },
        },
      };
      const round = makeRound({
        input: { message: 'my question' },
        steps: [
          {
            type: ConversationRoundStepType.preExecutionWorkflow,
            workflow_context: workflowContext,
          },
        ],
        response: { message: 'my answer' },
        model_usage: {
          connector_id: 'stale-folded-connector',
          llm_calls: 1,
          input_tokens: 10,
          output_tokens: 5,
        },
      });
      const context = createContext({
        round,
        agentId: 'ag-1',
        conversationId: 'cv-1',
        connectorId: ' current-connector ',
      });

      await runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger });

      expect(executeWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'wf-1',
          workflowParams: {
            prompt: 'my question',
            response: 'my answer',
            round_id: 'round-1',
            agent_id: 'ag-1',
            conversation_id: 'cv-1',
            round_connector_id: 'current-connector',
            workflow_context: workflowContext,
            tool_calls: [],
          },
        })
      );
    });

    it('passes the in-memory round connector id to a workflow that declares it', async () => {
      const { workflowApi, getWorkflow, getInternalServices } = createDeps();
      getWorkflow.mockResolvedValue(
        makeWorkflow({
          additionalProperties: false,
          properties: {
            ...existingWorkflowInputs.properties,
            round_connector_id: { type: 'string' },
          },
        })
      );
      const context = createContext({
        round: makeRound({
          model_usage: {
            connector_id: 'round-connector',
            llm_calls: 1,
            input_tokens: 10,
            output_tokens: 5,
          },
        }),
      });

      await runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger });

      expect(getWorkflow).toHaveBeenCalledWith('wf-1', 'default', request);
      expect(executeWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowParams: expect.objectContaining({
            round_connector_id: 'round-connector',
          }),
        })
      );
    });

    it.each([undefined, '', '   ', 'unknown', ' unknown '])(
      'omits an unusable round connector id %p without looking up the workflow',
      async (connectorId) => {
        const { workflowApi, getWorkflow, getInternalServices } = createDeps();
        const context = createContext({
          round: makeRound({
            model_usage:
              connectorId === undefined
                ? undefined
                : {
                    connector_id: connectorId,
                    llm_calls: 1,
                    input_tokens: 10,
                    output_tokens: 5,
                  },
          }),
        });

        await runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger });

        expect(getWorkflow).not.toHaveBeenCalled();
        const params = executeWorkflowMock.mock.calls[0][0].workflowParams as Record<
          string,
          unknown
        >;
        expect(params).not.toHaveProperty('round_connector_id');
      }
    );

    it('omits agent_id, conversation_id, and round_connector_id when undefined or blank', async () => {
      const { workflowApi, getInternalServices } = createDeps();
      const context = createContext({
        agentId: undefined,
        conversationId: undefined,
        round: makeRound({
          model_usage: {
            connector_id: '  ',
            llm_calls: 1,
            input_tokens: 10,
            output_tokens: 5,
          },
        }),
      });

      await runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger });

      const params = executeWorkflowMock.mock.calls[0][0].workflowParams as Record<string, unknown>;
      expect(params).not.toHaveProperty('agent_id');
      expect(params).not.toHaveProperty('conversation_id');
      expect(params).not.toHaveProperty('round_connector_id');
      expect(params).not.toHaveProperty('workflow_context');
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

    describe('inputs added to the hook contract', () => {
      const round = makeRound({
        steps: [
          {
            type: ConversationRoundStepType.preExecutionWorkflow,
            workflow_context: { ns: { version: 1, data: { a: 1 } } },
          },
        ],
      });

      it('does not send them to a strict workflow that predates them', async () => {
        const { workflowApi, getWorkflow, getInternalServices } = createDeps({
          definition: strictDefinition(legacyInputNames),
        });

        await runAfterExecutionWorkflows({
          context: createContext({ round, connectorId: 'current-connector' }),
          workflowApi,
          getInternalServices,
          logger,
        });

        expect(getWorkflow).toHaveBeenCalledWith('wf-1', 'default', request);
        const params = executeWorkflowMock.mock.calls[0][0].workflowParams;
        expect(Object.keys(params).sort()).toEqual([...legacyInputNames].sort());
      });

      it('sends only the declared ones', async () => {
        const { workflowApi, getInternalServices } = createDeps({
          definition: strictDefinition([...legacyInputNames, 'round_connector_id']),
        });

        await runAfterExecutionWorkflows({
          context: createContext({ round, connectorId: 'current-connector' }),
          workflowApi,
          getInternalServices,
          logger,
        });

        const params = executeWorkflowMock.mock.calls[0][0].workflowParams;
        expect(params).toHaveProperty('round_connector_id', 'current-connector');
        expect(params).not.toHaveProperty('workflow_context');
      });

      describe('tool_results', () => {
        const toolResults = [
          { tool_result_id: 'r-1', type: ToolResultType.other, data: { rows: 5000 } },
        ];
        const roundWithToolCall = makeRound({
          steps: [
            {
              type: ConversationRoundStepType.toolCall,
              tool_id: 'my-tool',
              tool_call_id: 'tc-1',
              params: { key: 'val' },
              results: toolResults,
            },
          ],
        });

        it('sends tool call results to a workflow that declares tool_results', async () => {
          const { workflowApi, getInternalServices } = createDeps({
            definition: strictDefinition([...legacyInputNames, 'tool_results']),
          });

          await runAfterExecutionWorkflows({
            context: createContext({ round: roundWithToolCall }),
            workflowApi,
            getInternalServices,
            logger,
          });

          const params = executeWorkflowMock.mock.calls[0][0].workflowParams;
          expect(params.tool_results).toEqual([
            { tool_id: 'my-tool', tool_call_id: 'tc-1', results: toolResults },
          ]);
          expect(params.tool_calls).toEqual([
            { tool_id: 'my-tool', tool_call_id: 'tc-1', params: { key: 'val' } },
          ]);
        });

        const sendResultData = async (data: Record<string, unknown>) => {
          const { workflowApi, getInternalServices } = createDeps({
            definition: strictDefinition([...legacyInputNames, 'tool_results']),
          });
          const roundWithResult = makeRound({
            steps: [
              {
                type: ConversationRoundStepType.toolCall,
                tool_id: 'my-tool',
                tool_call_id: 'tc-1',
                params: {},
                results: [{ tool_result_id: 'r-1', type: ToolResultType.other, data }],
              },
            ],
          });

          await runAfterExecutionWorkflows({
            context: createContext({ round: roundWithResult }),
            workflowApi,
            getInternalServices,
            logger,
          });

          return executeWorkflowMock.mock.calls[0][0].workflowParams.tool_results;
        };

        it('bounds long strings and arrays inside result data in place', async () => {
          const toolResultsSent = await sendResultData({
            stdout: 'x'.repeat(MAX_TOOL_RESULT_STRING_CHARS * 10),
            rows: Array(MAX_TOOL_RESULT_ARRAY_ITEMS * 10).fill(1),
            exit_code: 0,
          });

          expect(toolResultsSent).toEqual([
            {
              tool_id: 'my-tool',
              tool_call_id: 'tc-1',
              results: [
                {
                  tool_result_id: 'r-1',
                  type: ToolResultType.other,
                  data: {
                    stdout: 'x'.repeat(MAX_TOOL_RESULT_STRING_CHARS),
                    rows: Array(MAX_TOOL_RESULT_ARRAY_ITEMS).fill(1),
                    exit_code: 0,
                  },
                },
              ],
            },
          ]);
        });

        it('omits result data that is still too large after bounding', async () => {
          const toolResultsSent = await sendResultData({
            rows: Array(MAX_TOOL_RESULT_ARRAY_ITEMS).fill('x'.repeat(MAX_TOOL_RESULT_STRING_CHARS)),
          });

          expect(toolResultsSent).toEqual([
            {
              tool_id: 'my-tool',
              tool_call_id: 'tc-1',
              results: [
                {
                  tool_result_id: 'r-1',
                  type: ToolResultType.other,
                  data: {
                    omitted: `result data exceeded ${MAX_TOOL_RESULT_DATA_CHARS} characters`,
                  },
                },
              ],
            },
          ]);
        });

        it('omits tool calls whose step has no results', async () => {
          const { workflowApi, getInternalServices } = createDeps({
            definition: strictDefinition([...legacyInputNames, 'tool_results']),
          });
          const stepWithoutResults = {
            type: ConversationRoundStepType.toolCall,
            tool_id: 'other-tool',
            tool_call_id: 'tc-2',
            params: {},
          } as ToolCallStep;
          const roundWithMissingResults = makeRound({
            steps: [...roundWithToolCall.steps, stepWithoutResults],
          });

          await runAfterExecutionWorkflows({
            context: createContext({ round: roundWithMissingResults }),
            workflowApi,
            getInternalServices,
            logger,
          });

          const params = executeWorkflowMock.mock.calls[0][0].workflowParams;
          expect(params.tool_results).toEqual([
            { tool_id: 'my-tool', tool_call_id: 'tc-1', results: toolResults },
          ]);
        });

        it('does not send tool_results to a workflow that does not declare it', async () => {
          const { workflowApi, getInternalServices } = createDeps({
            definition: strictDefinition(legacyInputNames),
          });

          await runAfterExecutionWorkflows({
            context: createContext({ round: roundWithToolCall }),
            workflowApi,
            getInternalServices,
            logger,
          });

          const params = executeWorkflowMock.mock.calls[0][0].workflowParams;
          expect(Object.keys(params).sort()).toEqual([...legacyInputNames].sort());
        });
      });

      it('sends the base inputs and still runs when the workflow cannot be read', async () => {
        const { workflowApi, getWorkflow, getInternalServices } = createDeps();
        getWorkflow.mockRejectedValue(new Error('boom'));

        await runAfterExecutionWorkflows({
          context: createContext({ round, connectorId: 'current-connector' }),
          workflowApi,
          getInternalServices,
          logger,
        });

        const params = executeWorkflowMock.mock.calls[0][0].workflowParams;
        expect(Object.keys(params).sort()).toEqual([...legacyInputNames].sort());
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Could not read the inputs of workflow "wf-1"')
        );
      });

      it('skips the lookup when there is nothing optional to send', async () => {
        const { workflowApi, getWorkflow, getInternalServices } = createDeps();

        await runAfterExecutionWorkflows({
          context: createContext({
            round: makeRound({ model_usage: undefined }),
            connectorId: undefined,
          }),
          workflowApi,
          getInternalServices,
          logger,
        });

        expect(getWorkflow).not.toHaveBeenCalled();
        expect(executeWorkflowMock).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('error handling (non-throwing — fire-and-forget)', () => {
    it.each([null, { definition: undefined }])(
      'runs with original inputs when the lookup returns %p',
      async (workflow) => {
        const { workflowApi, getWorkflow, getInternalServices } = createDeps();
        getWorkflow.mockResolvedValue(workflow);

        await expect(
          runAfterExecutionWorkflows({
            context: createContext(),
            workflowApi,
            getInternalServices,
            logger,
          })
        ).resolves.toBeUndefined();

        expect(executeWorkflowMock).toHaveBeenCalledWith(
          expect.objectContaining({ workflowId: 'wf-1' })
        );
        const params = executeWorkflowMock.mock.calls[0][0].workflowParams;
        expect(Object.keys(params).sort()).toEqual([...legacyInputNames].sort());
      }
    );

    it('executes a later workflow after an earlier workflow lookup fails', async () => {
      const { workflowApi, getWorkflow, getInternalServices } = createDeps();
      getWorkflow.mockRejectedValueOnce(new Error('lookup failed')).mockResolvedValueOnce(
        makeWorkflow({
          properties: {
            round_connector_id: { type: 'string' },
          },
        })
      );
      const context = createContext({
        agentConfiguration: { tools: [], post_execution_workflow_ids: ['wf-1', 'wf-2'] },
      });

      await expect(
        runAfterExecutionWorkflows({ context, workflowApi, getInternalServices, logger })
      ).resolves.toBeUndefined();

      expect(getWorkflow).toHaveBeenCalledTimes(2);
      expect(executeWorkflowMock).toHaveBeenCalledTimes(2);
      expect(executeWorkflowMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ workflowId: 'wf-1' })
      );
      expect(executeWorkflowMock.mock.calls[0][0].workflowParams).not.toHaveProperty(
        'round_connector_id'
      );
      expect(executeWorkflowMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          workflowId: 'wf-2',
          workflowParams: expect.objectContaining({ round_connector_id: 'connector-1' }),
        })
      );
    });

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
