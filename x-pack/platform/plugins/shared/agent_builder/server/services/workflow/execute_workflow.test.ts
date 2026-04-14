/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { executeWorkflow } from './execute_workflow';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

jest.mock('@kbn/inference-tracing', () => ({
  withActiveInferenceSpan: (_name: string, _opts: unknown, fn: (span?: unknown) => unknown) =>
    fn(undefined),
  ElasticGenAIAttributes: { InferenceSpanKind: 'InferenceSpanKind' },
}));

jest.mock('@kbn/agent-builder-genai-utils/tools/utils/workflows', () => ({
  getExecutionState: jest.fn().mockResolvedValue({ status: 'completed', output: {} }),
}));

describe('executeWorkflow', () => {
  const request = httpServerMock.createKibanaRequest();
  let mockWorkflowApi: jest.Mocked<WorkflowApi>;

  const validWorkflow = {
    id: 'wf-1',
    name: 'Test Workflow',
    enabled: true,
    valid: true,
    yaml: 'name: test',
    createdAt: '2025-01-01T00:00:00.000Z',
    createdBy: 'user',
    lastUpdatedAt: '2025-01-01T00:00:00.000Z',
    lastUpdatedBy: 'user',
    definition: {
      version: '1' as const,
      name: 'Test Workflow',
      enabled: true,
      triggers: [{ type: 'manual' as const }],
      steps: [],
    },
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockWorkflowApi = {
      getWorkflow: jest.fn().mockResolvedValue(validWorkflow),
      runWorkflow: jest.fn().mockResolvedValue('exec-1'),
    } as unknown as jest.Mocked<WorkflowApi>;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const runWithTimers = async (promise: Promise<unknown>) => {
    const result = promise;
    await jest.advanceTimersByTimeAsync(10_000);
    return result;
  };

  it('forwards metadata to runWorkflow when provided', async () => {
    const result = await runWithTimers(
      executeWorkflow({
        workflowId: 'wf-1',
        workflowParams: {},
        request,
        spaceId: 'default',
        workflowApi: mockWorkflowApi,
        waitForCompletion: false,
        metadata: { agent_id: 'agent-abc' },
      })
    );

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(mockWorkflowApi.runWorkflow).toHaveBeenCalledWith(
      expect.any(Object),
      'default',
      {},
      request,
      undefined,
      { agent_id: 'agent-abc' }
    );
  });

  it('passes undefined metadata to runWorkflow when not provided', async () => {
    const result = await runWithTimers(
      executeWorkflow({
        workflowId: 'wf-1',
        workflowParams: {},
        request,
        spaceId: 'default',
        workflowApi: mockWorkflowApi,
        waitForCompletion: false,
      })
    );

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(mockWorkflowApi.runWorkflow).toHaveBeenCalledWith(
      expect.any(Object),
      'default',
      {},
      request,
      undefined,
      undefined
    );
  });

  it('returns error when workflow is not found', async () => {
    mockWorkflowApi.getWorkflow.mockResolvedValue(null as any);

    const result = await executeWorkflow({
      workflowId: 'missing',
      workflowParams: {},
      request,
      spaceId: 'default',
      workflowApi: mockWorkflowApi,
    });

    expect(result.success).toBe(false);
    expect(mockWorkflowApi.runWorkflow).not.toHaveBeenCalled();
  });

  it('returns error when workflow is disabled', async () => {
    mockWorkflowApi.getWorkflow.mockResolvedValue({ ...validWorkflow, enabled: false });

    const result = await executeWorkflow({
      workflowId: 'wf-1',
      workflowParams: {},
      request,
      spaceId: 'default',
      workflowApi: mockWorkflowApi,
    });

    expect(result.success).toBe(false);
    expect(mockWorkflowApi.runWorkflow).not.toHaveBeenCalled();
  });
});
