/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AgentBuilderErrorCode,
  WORKFLOW_CONTEXT_RECALLED_ID_MAX_LENGTH,
  WORKFLOW_CONTEXT_RECALLED_IDS_MAX_COUNT,
} from '@kbn/agent-builder-common';
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

  const createContext = (overrides: { conversationId?: string; agentId?: string } = {}) => ({
    request,
    nextInput: { message: 'hello', attachments: [] },
    agentId: 'agent-1',
    ...overrides,
  });

  const createDeps = () => {
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
      workflowApi: {} as WorkflowApi,
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

  it('returns updated nextInput when workflow returns new_prompt', async () => {
    const context = createContext();
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
      nextInput: {
        message: 'hello',
        attachments: [],
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

  it('persists only bounded string recalled ids from workflow_context', async () => {
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
            semantic_memory: {
              recalled_ids: [
                'memory-1',
                42,
                'x'.repeat(WORKFLOW_CONTEXT_RECALLED_ID_MAX_LENGTH + 1),
                ...Array.from(
                  { length: WORKFLOW_CONTEXT_RECALLED_IDS_MAX_COUNT },
                  (_, index) => `memory-${index + 2}`
                ),
              ],
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

    const recalledIds = result?.nextInput?.workflow_context?.semantic_memory?.recalled_ids;
    expect(recalledIds).toHaveLength(WORKFLOW_CONTEXT_RECALLED_IDS_MAX_COUNT);
    expect(recalledIds?.[0]).toBe('memory-1');
    expect(recalledIds?.[1]).toHaveLength(WORKFLOW_CONTEXT_RECALLED_ID_MAX_LENGTH);
    expect(recalledIds?.every((id) => id.length <= WORKFLOW_CONTEXT_RECALLED_ID_MAX_LENGTH)).toBe(
      true
    );
  });

  it('throws workflowAborted when output requests abort', async () => {
    const context = createContext();
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
          conversation_id: 'conv-42',
          agent_id: 'agent-1',
        },
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
        },
      })
    );
  });
});
