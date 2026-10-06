/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentBuilderErrorCode, WORKFLOW_CONTEXT_MAX_BYTES } from '@kbn/agent-builder-common';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS } from '@kbn/management-settings-ids';
import { ExecutionStatus } from '@kbn/workflows';
import { runBeforeAgentWorkflows } from './run_before_agent_workflows';
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
type RunBeforeAgentWorkflowParams = Parameters<typeof runBeforeAgentWorkflows>[0];
type WorkflowApi = RunBeforeAgentWorkflowParams['workflowApi'];
type GetInternalServices = RunBeforeAgentWorkflowParams['getInternalServices'];

describe('runBeforeAgentWorkflows', () => {
  const request = httpServerMock.createKibanaRequest();
  const logger = loggingSystemMock.createLogger();

  const createContext = (
    overrides: { conversationId?: string; agentId?: string; roundExecutionIndex?: number } = {}
  ) => ({
    request,
    nextInput: { message: 'hello', attachments: [] },
    agentId: 'agent-1',
    ...overrides,
  });

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
  const allInputsDefinition = strictDefinition([
    'prompt',
    'conversation_id',
    'agent_id',
    'round_execution_index',
  ]);

  const createDeps = ({ definition = allInputsDefinition }: { definition?: unknown } = {}) => {
    const getWorkflow = jest.fn().mockResolvedValue({ definition });
    const savedObjects = savedObjectsServiceMock.createStartContract();
    const uiSettings = uiSettingsServiceMock.createStartContract();
    const uiSettingsClient = uiSettingsServiceMock.createClient();
    uiSettingsClient.get.mockResolvedValue(true);
    const soClient = savedObjects.createInternalRepository();
    savedObjects.getScopedClient.mockReturnValue(soClient);
    uiSettings.asScopedToClient.mockReturnValue(uiSettingsClient);

    const registry = {
      get: jest.fn().mockResolvedValue({ id: 'agent-1', type: 'chat', configuration: {} }),
    };
    const resolveAgentConfiguration = jest.fn().mockResolvedValue({ workflow_ids: ['wf-1'] });

    return {
      workflowApi: { getWorkflow } as unknown as WorkflowApi,
      getWorkflow,
      getInternalServices: jest.fn(() => ({
        agents: {
          getRegistry: jest.fn().mockResolvedValue(registry),
          resolveAgentConfiguration,
        },
        spaces: {},
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
        uiSettings,
        savedObjects,
      })) as unknown as GetInternalServices,
      registry,
      resolveAgentConfiguration,
      uiSettingsClient,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentSpaceIdMock.mockReturnValue('default');
  });

  it('throws workflowExecutionFailed when workflow execution request fails', async () => {
    const context = createContext();
    const { workflowApi, getInternalServices } = createDeps();
    executeWorkflowMock.mockResolvedValue({
      success: false,
      error: 'Workflow unavailable',
    });

    await expect(
      runBeforeAgentWorkflows({
        context,
        workflowApi,
        getInternalServices,
        logger,
      })
    ).rejects.toMatchObject({
      code: AgentBuilderErrorCode.workflowExecutionFailed,
      message: 'Workflow unavailable',
      meta: { workflow: 'wf-1' },
    });
  });

  it('throws workflowExecutionFailed with workflow engine error_message', async () => {
    const context = createContext();
    const { workflowApi, getInternalServices } = createDeps();
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-1',
        status: ExecutionStatus.FAILED,
        workflow_id: 'wf-1',
        workflow_name: 'Workflow One',
        started_at: '2026-01-01T00:00:00.000Z',
        error_message: 'Validation failed',
      },
    });

    await expect(
      runBeforeAgentWorkflows({
        context,
        workflowApi,
        getInternalServices,
        logger,
      })
    ).rejects.toMatchObject({
      code: AgentBuilderErrorCode.workflowExecutionFailed,
      message: 'Validation failed',
      meta: { workflow: 'Workflow One' },
    });
  });

  it('throws workflowExecutionFailed with fallback message when FAILED has no error_message', async () => {
    const context = createContext();
    const { workflowApi, getInternalServices } = createDeps();
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-2',
        status: ExecutionStatus.FAILED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
      },
    });

    await expect(
      runBeforeAgentWorkflows({
        context,
        workflowApi,
        getInternalServices,
        logger,
      })
    ).rejects.toMatchObject({
      code: AgentBuilderErrorCode.workflowExecutionFailed,
      message: 'Workflow "wf-1" failed',
      meta: { workflow: 'wf-1' },
    });
  });

  it.each([0, 1, 2])('returns new_prompt on execution index %i', async (roundExecutionIndex) => {
    const context = createContext({ roundExecutionIndex });
    const { workflowApi, getInternalServices } = createDeps();
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-3',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
        output: {
          new_prompt: 'updated prompt',
        },
      },
    });

    await expect(
      runBeforeAgentWorkflows({
        context,
        workflowApi,
        getInternalServices,
        logger,
      })
    ).resolves.toEqual({
      nextInput: {
        message: 'updated prompt',
        attachments: [],
      },
    });
    expect(executeWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowParams: expect.objectContaining({ round_execution_index: roundExecutionIndex }),
      })
    );
  });

  it('honors another workflow output when the first workflow skips on resume', async () => {
    const { workflowApi, getInternalServices, resolveAgentConfiguration } = createDeps();
    resolveAgentConfiguration.mockResolvedValue({ workflow_ids: ['nightshift', 'policy'] });
    executeWorkflowMock
      .mockResolvedValueOnce({
        success: true,
        execution: {
          execution_id: 'nightshift-exec',
          status: ExecutionStatus.COMPLETED,
          workflow_id: 'nightshift',
          started_at: '2026-01-01T00:00:00.000Z',
          output: {},
        },
      })
      .mockResolvedValueOnce({
        success: true,
        execution: {
          execution_id: 'policy-exec',
          status: ExecutionStatus.COMPLETED,
          workflow_id: 'policy',
          started_at: '2026-01-01T00:00:00.000Z',
          output: { new_prompt: 'policy rewrite' },
        },
      });

    await expect(
      runBeforeAgentWorkflows({
        context: createContext({ roundExecutionIndex: 1 }),
        workflowApi,
        getInternalServices,
        logger,
      })
    ).resolves.toEqual({ nextInput: { message: 'policy rewrite', attachments: [] } });
    expect(executeWorkflowMock).toHaveBeenCalledTimes(2);
    expect(executeWorkflowMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        workflowId: 'policy',
        workflowParams: expect.objectContaining({ round_execution_index: 1 }),
      })
    );
  });

  it('accumulates model_context without replacing the user message', async () => {
    const context = createContext();
    const { workflowApi, getInternalServices, resolveAgentConfiguration } = createDeps();
    resolveAgentConfiguration.mockResolvedValue({ workflow_ids: ['wf-1', 'wf-2'] });
    executeWorkflowMock
      .mockResolvedValueOnce({
        success: true,
        execution: {
          execution_id: 'exec-context-1',
          status: ExecutionStatus.COMPLETED,
          workflow_id: 'wf-1',
          started_at: '2026-01-01T00:00:00.000Z',
          output: { model_context: 'first context' },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        execution: {
          execution_id: 'exec-context-2',
          status: ExecutionStatus.COMPLETED,
          workflow_id: 'wf-2',
          started_at: '2026-01-01T00:00:00.000Z',
          output: { model_context: '  second context  ' },
        },
      });

    await expect(
      runBeforeAgentWorkflows({
        context,
        workflowApi,
        getInternalServices,
        logger,
      })
    ).resolves.toEqual({
      preExecutionWorkflow: {
        model_context: 'first context\n\nsecond context',
      },
    });
  });

  it('ignores a malformed non-string model_context', async () => {
    const context = createContext();
    const { workflowApi, getInternalServices } = createDeps();
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-malformed-context',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
        output: { model_context: 123 },
      },
    });

    await expect(
      runBeforeAgentWorkflows({
        context,
        workflowApi,
        getInternalServices,
        logger,
      })
    ).resolves.toBeUndefined();
  });

  it('ignores malformed or oversized workflow context envelopes', async () => {
    const context = createContext();
    const { workflowApi, getInternalServices } = createDeps();
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-workflow-context',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
        output: {
          workflow_context: {
            invalid: { version: 0, data: { value: 'x'.repeat(WORKFLOW_CONTEXT_MAX_BYTES) } },
          },
        },
      },
    });

    await expect(
      runBeforeAgentWorkflows({ context, workflowApi, getInternalServices, logger })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Ignoring malformed workflow context from workflow wf-1'
    );
  });

  it.each([
    [
      'too many namespaces',
      Object.fromEntries(
        Array.from({ length: 1000 }, (_, i) => [`namespace-${i}`, { version: 1, data: {} }])
      ),
    ],
    [
      'oversized array',
      {
        ns: { version: 1, data: { entries: new Array(WORKFLOW_CONTEXT_MAX_BYTES + 1).fill('x') } },
      },
    ],
  ])('rejects %s without accepting truncated context', async (_label, workflowContext) => {
    const context = createContext();
    const { workflowApi, getInternalServices } = createDeps();
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-bounded-context',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
        output: { workflow_context: workflowContext },
      },
    });

    await expect(
      runBeforeAgentWorkflows({ context, workflowApi, getInternalServices, logger })
    ).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      'Ignoring malformed workflow context from workflow wf-1'
    );
  });

  it('does not warn when a workflow omits workflow_context', async () => {
    const context = createContext();
    const { workflowApi, getInternalServices } = createDeps();
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-no-context',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
        output: {},
      },
    });

    await runBeforeAgentWorkflows({ context, workflowApi, getInternalServices, logger });
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('retains a JSON namespace named __proto__ through normalization', async () => {
    const context = createContext();
    const { workflowApi, getInternalServices } = createDeps();
    const workflowContext = JSON.parse('{"__proto__":{"version":1,"data":{"value":1}}}');
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-prototype-namespace',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
        output: { workflow_context: workflowContext },
      },
    });

    const result = await runBeforeAgentWorkflows({
      context,
      workflowApi,
      getInternalServices,
      logger,
    });
    expect(Object.hasOwn(result?.preExecutionWorkflow?.workflow_context ?? {}, '__proto__')).toBe(
      true
    );
    expect(JSON.stringify(result?.preExecutionWorkflow?.workflow_context)).toBe(
      JSON.stringify(workflowContext)
    );
  });

  it('shallow-merges independent namespaces and replaces repeated namespaces', async () => {
    const context = createContext();
    const { workflowApi, getInternalServices, resolveAgentConfiguration } = createDeps();
    resolveAgentConfiguration.mockResolvedValue({ workflow_ids: ['wf-1', 'wf-2'] });
    executeWorkflowMock
      .mockResolvedValueOnce({
        success: true,
        execution: {
          execution_id: 'exec-memory-1',
          status: ExecutionStatus.COMPLETED,
          workflow_id: 'wf-1',
          started_at: '2026-01-01T00:00:00.000Z',
          output: {
            workflow_context: {
              'nightshift.semantic_memory.recall': {
                version: 1,
                data: { recalled_ids: ['memory-a'] },
              },
              'other.context': { version: 1, data: { value: 'preserved' } },
            },
          },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        execution: {
          execution_id: 'exec-memory-2',
          status: ExecutionStatus.COMPLETED,
          workflow_id: 'wf-2',
          started_at: '2026-01-01T00:00:00.000Z',
          output: {
            workflow_context: {
              'nightshift.semantic_memory.recall': {
                version: 2,
                data: { recalled_ids: ['memory-b'] },
              },
            },
          },
        },
      });

    const result = await runBeforeAgentWorkflows({
      context,
      workflowApi,
      getInternalServices,
      logger,
    });

    expect(result?.preExecutionWorkflow?.workflow_context).toEqual({
      'nightshift.semantic_memory.recall': {
        version: 2,
        data: { recalled_ids: ['memory-b'] },
      },
      'other.context': { version: 1, data: { value: 'preserved' } },
    });
  });

  it.each([0, 1, 2])('honors workflow abort on execution index %i', async (roundExecutionIndex) => {
    const context = createContext({ roundExecutionIndex });
    const { workflowApi, getInternalServices } = createDeps();
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-4',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        workflow_name: 'Workflow Abort',
        started_at: '2026-01-01T00:00:00.000Z',
        output: {
          abort: true,
          abort_message: 'Stop this run',
        },
      },
    });

    await expect(
      runBeforeAgentWorkflows({
        context,
        workflowApi,
        getInternalServices,
        logger,
      })
    ).rejects.toMatchObject({
      code: AgentBuilderErrorCode.workflowAborted,
      message: 'Stop this run',
      meta: { workflow: 'Workflow Abort' },
    });
    expect(executeWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowParams: expect.objectContaining({ round_execution_index: roundExecutionIndex }),
      })
    );
  });

  it('executes each workflow once when global and agent workflows overlap', async () => {
    const context = createContext();
    const { workflowApi, getInternalServices, uiSettingsClient, resolveAgentConfiguration } =
      createDeps();
    uiSettingsClient.get.mockImplementation(async (key: string) => {
      if (key === AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS) {
        return ['wf-1', 'wf-2', 'wf-2'];
      }
      return true;
    });
    resolveAgentConfiguration.mockResolvedValue({ workflow_ids: ['wf-2', 'wf-3'] });
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-overlap',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
        output: {},
      },
    });

    await runBeforeAgentWorkflows({
      context,
      workflowApi,
      getInternalServices,
      logger,
    });

    expect(executeWorkflowMock).toHaveBeenCalledTimes(3);
    expect(executeWorkflowMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ workflowId: 'wf-1' })
    );
    expect(executeWorkflowMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ workflowId: 'wf-2' })
    );
    expect(executeWorkflowMock).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ workflowId: 'wf-3' })
    );
  });

  it('forwards conversation_id and agent_id to beforeAgent workflows', async () => {
    const context = createContext({ conversationId: 'conv-42' });
    const { workflowApi, getInternalServices } = createDeps();
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-params',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
        output: {},
      },
    });

    await runBeforeAgentWorkflows({
      context,
      workflowApi,
      getInternalServices,
      logger,
    });

    expect(executeWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'wf-1',
        workflowParams: {
          prompt: 'hello',
          round_execution_index: 0,
          conversation_id: 'conv-42',
          agent_id: 'agent-1',
        },
      })
    );
  });

  it('forwards the resume index to configured workflows', async () => {
    const context = { ...createContext(), roundExecutionIndex: 2 };
    const { workflowApi, getInternalServices } = createDeps();
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-resume',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
        output: {},
      },
    });

    await runBeforeAgentWorkflows({ context, workflowApi, getInternalServices, logger });

    expect(executeWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowParams: expect.objectContaining({ round_execution_index: 2 }),
      })
    );
  });

  it('omits agent_id when it is unavailable', async () => {
    const context = createContext({ agentId: undefined });
    const { workflowApi, getInternalServices, uiSettingsClient } = createDeps();
    uiSettingsClient.get.mockImplementation(async (key: string) => {
      if (key === AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS) {
        return ['wf-1'];
      }
      return true;
    });
    executeWorkflowMock.mockResolvedValue({
      success: true,
      execution: {
        execution_id: 'exec-no-agent',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
        output: {},
      },
    });

    await runBeforeAgentWorkflows({ context, workflowApi, getInternalServices, logger });

    expect(executeWorkflowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowParams: {
          prompt: 'hello',
          round_execution_index: 0,
        },
      })
    );
  });

  describe('inputs added to the hook contract', () => {
    const completed = {
      success: true as const,
      execution: {
        execution_id: 'exec-inputs',
        status: ExecutionStatus.COMPLETED,
        workflow_id: 'wf-1',
        started_at: '2026-01-01T00:00:00.000Z',
        output: {},
      },
    };

    it('does not send them to a strict workflow that predates them', async () => {
      const { workflowApi, getWorkflow, getInternalServices } = createDeps({
        definition: strictDefinition(['prompt', 'conversation_id']),
      });
      executeWorkflowMock.mockResolvedValue(completed);

      await runBeforeAgentWorkflows({
        context: createContext({ conversationId: 'conv-1', roundExecutionIndex: 1 }),
        workflowApi,
        getInternalServices,
        logger,
      });

      expect(getWorkflow).toHaveBeenCalledWith('wf-1', 'default', request);
      expect(executeWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowParams: { prompt: 'hello', conversation_id: 'conv-1' },
        })
      );
    });

    it('sends only the declared ones', async () => {
      const { workflowApi, getInternalServices } = createDeps({
        definition: strictDefinition(['prompt', 'round_execution_index']),
      });
      executeWorkflowMock.mockResolvedValue(completed);

      await runBeforeAgentWorkflows({
        context: createContext({ roundExecutionIndex: 1 }),
        workflowApi,
        getInternalServices,
        logger,
      });

      expect(executeWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowParams: { prompt: 'hello', round_execution_index: 1 },
        })
      );
    });

    it('sends the base inputs when the workflow cannot be read', async () => {
      const { workflowApi, getWorkflow, getInternalServices } = createDeps();
      getWorkflow.mockRejectedValue(new Error('boom'));
      executeWorkflowMock.mockResolvedValue(completed);

      await runBeforeAgentWorkflows({
        context: createContext(),
        workflowApi,
        getInternalServices,
        logger,
      });

      expect(executeWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({ workflowParams: { prompt: 'hello' } })
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not read the inputs of workflow "wf-1"')
      );
    });

    it('sends the base inputs when the workflow is not found', async () => {
      const { workflowApi, getWorkflow, getInternalServices } = createDeps();
      getWorkflow.mockResolvedValue(null);
      executeWorkflowMock.mockResolvedValue(completed);

      await runBeforeAgentWorkflows({
        context: createContext(),
        workflowApi,
        getInternalServices,
        logger,
      });

      expect(executeWorkflowMock).toHaveBeenCalledWith(
        expect.objectContaining({ workflowParams: { prompt: 'hello' } })
      );
    });
  });
});
