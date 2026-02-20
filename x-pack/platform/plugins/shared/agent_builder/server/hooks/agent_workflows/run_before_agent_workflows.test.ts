/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentBuilderErrorCode } from '@kbn/agent-builder-common';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { ExecutionStatus } from '@kbn/workflows';
import { runBeforeAgentWorkflows } from './run_before_agent_workflows';
import { executeWorkflow } from '../../services/workflow/execute_workflow';
import { getCurrentSpaceId } from '../../utils/spaces';

jest.mock('../../services/workflow/execute_workflow', () => ({
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

  const createContext = () => ({
    request,
    nextInput: { message: 'hello', attachments: [] },
    agentId: 'agent-1',
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
      get: jest.fn().mockResolvedValue({
        id: 'agent-1',
        configuration: {
          workflow_ids: ['wf-1'],
        },
      }),
    };

    return {
      workflowApi: {} as WorkflowApi,
      getInternalServices: jest.fn(() => ({
        agents: {
          getRegistry: jest.fn().mockResolvedValue(registry),
        },
        spaces: {},
        featureFlags: {
          getBooleanValue: jest.fn().mockResolvedValue(true),
        },
        uiSettings,
        savedObjects,
      })) as unknown as GetInternalServices,
      registry,
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
});
