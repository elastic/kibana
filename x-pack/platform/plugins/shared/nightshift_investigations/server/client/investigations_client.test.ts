/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type {
  InvestigationSavedObjectClient,
  NightshiftInvestigationAttributes,
} from '../saved_objects';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import {
  InvestigationNotFoundError,
  InvestigationSubjectMissingError,
  InvestigationUnavailableError,
  NightshiftInvestigationsClient,
} from './investigations_client';

jest.mock('../lib/install_investigation_agent', () => ({
  installInvestigationAgent: jest.fn().mockResolvedValue(undefined),
}));

const installInvestigationAgentMock = installInvestigationAgent as jest.MockedFunction<
  typeof installInvestigationAgent
>;

const SPACE_ID = 'test-space';

const mockManagement = {
  getWorkflowExecution: jest.fn(),
  getWorkflow: jest.fn(),
  runWorkflow: jest.fn(),
  getWorkflowExecutions: jest.fn(),
};

const mockWorkflowsManagement = {
  management: mockManagement,
} as unknown as WorkflowsServerPluginSetup;

const mockAgentBuilder = {} as unknown as AgentBuilderPluginStart;

const mockInvestigationSoClient = {
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  find: jest.fn(),
  findByConcurrencyKey: jest.fn(),
} as unknown as jest.Mocked<InvestigationSavedObjectClient>;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

const mockRequest = {} as KibanaRequest;

const makeClient = () =>
  new NightshiftInvestigationsClient({
    request: mockRequest,
    workflowsManagement: mockWorkflowsManagement,
    logger: mockLogger,
    spaceIdOverride: SPACE_ID,
    agentBuilder: mockAgentBuilder,
    investigationSoClient: mockInvestigationSoClient,
  });

const makeSoAttrs = (
  overrides: Partial<NightshiftInvestigationAttributes> = {}
): NightshiftInvestigationAttributes => ({
  investigation_id: 'inv-1',
  status: 'completed',
  subject_type: 'alert',
  subject_id: 'alert-42',
  trigger_type: 'automatic',
  concurrency_key: undefined,
  executed_by: 'test-user',
  created_at: '2024-01-01T00:00:00Z',
  completed_at: '2024-01-01T01:00:00Z',
  summary: 'All clear.',
  conclusion: 'No issues found.',
  hypotheses: [{ candidate: 'h1', confidence: 0.9, status: 'confirmed' }],
  recommendations: [{ title: 'Keep monitoring' }],
  blind_spots: [{ title: 'Blind spot', description: 'desc' }],
  significant_event_updates: [],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  installInvestigationAgentMock.mockResolvedValue(undefined);
  mockInvestigationSoClient.get.mockResolvedValue(undefined);
  mockInvestigationSoClient.update.mockResolvedValue(undefined);
  mockInvestigationSoClient.create.mockResolvedValue(undefined);
});

describe('NightshiftInvestigationsClient.get()', () => {
  it('throws InvestigationNotFoundError when SO does not exist', async () => {
    mockInvestigationSoClient.get.mockResolvedValue(undefined);
    await expect(makeClient().get('inv-123')).rejects.toThrow(InvestigationNotFoundError);
  });

  it('returns full structured output from SO', async () => {
    const attrs = makeSoAttrs({
      conversation_id: 'conv-1',
      impact: { entities: [{ name: 'checkout-service' }] },
    });
    mockInvestigationSoClient.get.mockResolvedValue(attrs);
    const result = await makeClient().get('inv-1');

    expect(result).toEqual({
      investigation_id: 'inv-1',
      subject: { type: 'alert', id: 'alert-42' },
      trigger_type: 'automatic',
      status: 'completed',
      started_at: '2024-01-01T00:00:00Z',
      completed_at: '2024-01-01T01:00:00Z',
      concurrency_key: undefined,
      executed_by: 'test-user',
      error: undefined,
      summary: 'All clear.',
      conclusion: 'No issues found.',
      hypotheses: [{ candidate: 'h1', confidence: 0.9, status: 'confirmed' }],
      recommendations: [{ title: 'Keep monitoring' }],
      blind_spots: [{ title: 'Blind spot', description: 'desc' }],
      significant_event_updates: [],
      conversation_id: 'conv-1',
      impact: { entities: [{ name: 'checkout-service' }] },
    });
  });

  it('returns subject.summary from the SO subject_summary attribute', async () => {
    const long = `${'x'.repeat(400)} and a trailing clause that must not be cut mid-sentence.`;
    mockInvestigationSoClient.get.mockResolvedValue(
      makeSoAttrs({
        subject_type: 'significant_event',
        subject_id: 'event-42',
        subject_summary: long,
      })
    );

    const result = await makeClient().get('inv-1');

    expect(result.subject).toEqual({
      type: 'significant_event',
      id: 'event-42',
      summary: long,
    });
  });

  it('omits subject.summary when subject_summary is absent', async () => {
    mockInvestigationSoClient.get.mockResolvedValue(makeSoAttrs());
    const result = await makeClient().get('inv-1');
    expect(result.subject).toEqual({ type: 'alert', id: 'alert-42' });
  });

  it('does not call workflow execution when SO is found with terminal status', async () => {
    mockInvestigationSoClient.get.mockResolvedValue(makeSoAttrs());
    await makeClient().get('inv-1');
    expect(mockManagement.getWorkflowExecution).not.toHaveBeenCalled();
  });

  describe('stale-running reconciliation', () => {
    it('reconciles when SO says running but workflow is completed', async () => {
      mockInvestigationSoClient.get.mockResolvedValue(
        makeSoAttrs({ status: 'running', completed_at: undefined })
      );
      mockManagement.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        finishedAt: '2024-01-01T02:00:00Z',
      });

      const result = await makeClient().get('inv-1');

      expect(result.status).toBe('completed');
      expect(result.completed_at).toBe('2024-01-01T02:00:00Z');
      expect(mockInvestigationSoClient.update).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({ status: 'completed', completed_at: '2024-01-01T02:00:00Z' })
      );
    });

    it('reconciles when SO says running but workflow has failed', async () => {
      mockInvestigationSoClient.get.mockResolvedValue(
        makeSoAttrs({ status: 'running', completed_at: undefined, error: undefined })
      );
      mockManagement.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.FAILED,
        finishedAt: '2024-01-01T03:00:00Z',
        error: { message: 'Internal credential error: secret-token-xyz' },
      });

      const result = await makeClient().get('inv-1');

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Investigation failed');
      expect(result.error).not.toContain('secret-token-xyz');
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('secret-token-xyz'));
      expect(mockInvestigationSoClient.update).toHaveBeenCalledWith(
        'inv-1',
        expect.objectContaining({ status: 'failed', error: 'Investigation failed' })
      );
    });

    it('does not reconcile when workflow is also still running', async () => {
      mockInvestigationSoClient.get.mockResolvedValue(
        makeSoAttrs({ status: 'running', completed_at: undefined })
      );
      mockManagement.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.RUNNING,
      });

      const result = await makeClient().get('inv-1');

      expect(result.status).toBe('running');
      expect(mockInvestigationSoClient.update).not.toHaveBeenCalled();
    });

    it('does not fail if SO update during reconciliation throws', async () => {
      mockInvestigationSoClient.get.mockResolvedValue(
        makeSoAttrs({ status: 'running', completed_at: undefined })
      );
      mockManagement.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        finishedAt: '2024-01-01T02:00:00Z',
      });
      mockInvestigationSoClient.update.mockRejectedValue(new Error('SO update failed'));

      const result = await makeClient().get('inv-1');
      expect(result.status).toBe('completed');
    });

    it('does not reconcile when workflowsManagement is unavailable', async () => {
      const client = new NightshiftInvestigationsClient({
        request: mockRequest,
        logger: mockLogger,
        spaceIdOverride: SPACE_ID,
        investigationSoClient: mockInvestigationSoClient,
      });
      mockInvestigationSoClient.get.mockResolvedValue(
        makeSoAttrs({ status: 'running', completed_at: undefined })
      );

      const result = await client.get('inv-1');
      expect(result.status).toBe('running');
      expect(mockManagement.getWorkflowExecution).not.toHaveBeenCalled();
    });
  });
});

describe('NightshiftInvestigationsClient.list()', () => {
  const makeListResult = (overrides: Record<string, unknown> = {}) => ({
    results: [],
    total: 0,
    page: 1,
    size: 20,
    ...overrides,
  });

  beforeEach(() => {
    mockInvestigationSoClient.find.mockResolvedValue(makeListResult());
  });

  it('uses default page=1 and perPage=20', async () => {
    await makeClient().list();
    expect(mockInvestigationSoClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, perPage: 20 })
    );
  });

  it('passes statuses filter', async () => {
    await makeClient().list({ statuses: ['running', 'completed'] });
    expect(mockInvestigationSoClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ['running', 'completed'] })
    );
  });

  it('maps sort_field=finished_at to completed_at', async () => {
    await makeClient().list({ sort_field: 'finished_at' });
    expect(mockInvestigationSoClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ sortField: 'completed_at' })
    );
  });

  it('defaults sortField to created_at when sort_field is omitted', async () => {
    await makeClient().list({});
    expect(mockInvestigationSoClient.find).toHaveBeenCalledWith(
      expect.objectContaining({ sortField: 'created_at' })
    );
  });

  it('returns a slim list item without structured output', async () => {
    mockInvestigationSoClient.find.mockResolvedValue({
      results: [
        {
          id: 'inv-42',
          type: 'nightshift-investigation',
          references: [],
          attributes: makeSoAttrs({ concurrency_key: 'key-1' }),
        },
      ],
      total: 1,
      page: 1,
      size: 20,
    });

    const result = await makeClient().list({});
    expect(result.results[0]).toEqual({
      investigation_id: 'inv-42',
      subject: { type: 'alert', id: 'alert-42' },
      trigger_type: 'automatic',
      status: 'completed',
      started_at: '2024-01-01T00:00:00Z',
      completed_at: '2024-01-01T01:00:00Z',
      concurrency_key: 'key-1',
      executed_by: 'test-user',
      error: undefined,
      summary: 'All clear.',
    });
    expect(result.results[0]).not.toHaveProperty('conclusion');
    expect(result.results[0]).not.toHaveProperty('hypotheses');
    expect(result.results[0]).not.toHaveProperty('impact');
    expect(result.results[0]).not.toHaveProperty('conversation_id');
  });

  it('includes subject.summary on list items when subject_summary is stored', async () => {
    mockInvestigationSoClient.find.mockResolvedValue({
      results: [
        {
          id: 'inv-42',
          type: 'nightshift-investigation',
          references: [],
          attributes: makeSoAttrs({ subject_summary: 'CPU saturation' }),
        },
      ],
      total: 1,
      page: 1,
      size: 20,
    });

    const result = await makeClient().list({});
    expect(result.results[0].subject).toEqual({
      type: 'alert',
      id: 'alert-42',
      summary: 'CPU saturation',
    });
  });

  describe('stale-running reconciliation', () => {
    const runningListResult = () => ({
      results: [
        {
          id: 'inv-running',
          type: 'nightshift-investigation',
          references: [],
          attributes: makeSoAttrs({ status: 'running', completed_at: undefined }),
        },
      ],
      total: 1,
      page: 1,
      size: 20,
    });

    it('reconciles running items whose workflow has finished', async () => {
      mockInvestigationSoClient.find.mockResolvedValue(runningListResult());
      mockManagement.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.COMPLETED,
        finishedAt: '2024-01-01T02:00:00Z',
      });

      const result = await makeClient().list({});

      expect(result.results[0].status).toBe('completed');
      expect(result.results[0].completed_at).toBe('2024-01-01T02:00:00Z');
      expect(mockInvestigationSoClient.update).toHaveBeenCalledWith(
        'inv-running',
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('keeps running items whose workflow is still running', async () => {
      mockInvestigationSoClient.find.mockResolvedValue(runningListResult());
      mockManagement.getWorkflowExecution.mockResolvedValue({
        status: ExecutionStatus.RUNNING,
      });

      const result = await makeClient().list({});

      expect(result.results[0].status).toBe('running');
      expect(mockInvestigationSoClient.update).not.toHaveBeenCalled();
    });

    it('falls back to the SO status when the engine lookup fails', async () => {
      mockInvestigationSoClient.find.mockResolvedValue(runningListResult());
      mockManagement.getWorkflowExecution.mockRejectedValue(new Error('engine unavailable'));

      const result = await makeClient().list({});

      expect(result.results[0].status).toBe('running');
    });

    it('does not query the engine when no item is running', async () => {
      mockInvestigationSoClient.find.mockResolvedValue(makeListResult());
      await makeClient().list({});
      expect(mockManagement.getWorkflowExecution).not.toHaveBeenCalled();
    });
  });

  it('source-filters find to list fields', async () => {
    await makeClient().list();
    expect(mockInvestigationSoClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.arrayContaining(['status', 'summary', 'error', 'subject_summary']),
      })
    );
    const { fields } = mockInvestigationSoClient.find.mock.calls[0][0];
    expect(fields).not.toContain('hypotheses');
    expect(fields).not.toContain('conclusion');
    expect(fields).not.toContain('impact');
    expect(fields).not.toContain('conversation_id');
  });
});

describe('NightshiftInvestigationsClient.start()', () => {
  const WORKFLOW_ID = SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID;
  const mockWorkflow = { id: WORKFLOW_ID, definition: { steps: [] } };

  beforeEach(() => {
    mockManagement.getWorkflowExecution.mockImplementation(async (id: string) => {
      const lastCall = mockManagement.runWorkflow.mock.calls.at(-1);
      const inputs = lastCall?.[2];
      return {
        id,
        workflowId: WORKFLOW_ID,
        status: ExecutionStatus.RUNNING,
        startedAt: '2024-01-01T00:00:00Z',
        executedBy: 'test-user',
        context: { inputs },
      };
    });
  });

  it('calls runWorkflow with the correct inputs and returns investigation_id', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    const result = await makeClient().start({ subject: { type: 'alert', id: 'alert-1' } });

    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ id: WORKFLOW_ID }),
      SPACE_ID,
      expect.objectContaining({
        context: expect.objectContaining({
          source: 'alert',
          alert_id: 'alert-1',
          trigger_type: 'manual',
        }),
      }),
      expect.anything(),
      'nightshift-investigations'
    );
    expect(result).toEqual({ investigation_id: 'exec-123' });
  });

  it('creates the saved object after the workflow starts', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    await makeClient().start({ subject: { type: 'alert', id: 'alert-1' } });

    expect(mockInvestigationSoClient.create).toHaveBeenCalledWith({
      id: 'exec-123',
      attributes: expect.objectContaining({
        investigation_id: 'exec-123',
        status: 'running',
        subject_type: 'alert',
        subject_id: 'alert-1',
        trigger_type: 'manual',
      }),
    });
  });

  it('still returns the investigation id when the eager saved object creation fails', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');
    mockInvestigationSoClient.create.mockRejectedValue(new Error('SO write failed'));

    const result = await makeClient().start({ subject: { type: 'alert', id: 'alert-1' } });

    expect(result).toEqual({ investigation_id: 'exec-123' });
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('SO write failed'));
  });

  it('persists an explicit trigger_type into the workflow context', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-124');

    await makeClient().start({
      subject: { type: 'alert', id: 'alert-2' },
      trigger_type: 'automatic',
    });

    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      SPACE_ID,
      expect.objectContaining({
        context: expect.objectContaining({ trigger_type: 'automatic' }),
      }),
      expect.anything(),
      'nightshift-investigations'
    );
  });

  it('persists the subject summary into the workflow context', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    await makeClient().start({
      subject: { type: 'alert', id: 'alert-1', summary: 'CPU saturation on checkout-api' },
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.context.summary).toBe('CPU saturation on checkout-api');
    expect(mockInvestigationSoClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        attributes: expect.objectContaining({
          subject_summary: 'CPU saturation on checkout-api',
        }),
      })
    );
  });

  it('omits the context summary when none was supplied', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    await makeClient().start({ subject: { type: 'alert', id: 'alert-1' } });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.context).not.toHaveProperty('summary');
  });

  it('includes concurrency_key in inputs when provided', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-456');

    await makeClient().start({
      subject: { type: 'significant_event', id: 'se-99' },
      concurrency_key: 'key-abc',
    });

    expect(mockManagement.runWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      SPACE_ID,
      expect.objectContaining({ concurrency_key: 'key-abc' }),
      expect.anything(),
      'nightshift-investigations'
    );
  });

  it('uses the caller-supplied message and stream_names when provided', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-789');

    await makeClient().start({
      subject: { type: 'significant_event', id: 'se-1' },
      message: 'Checkout latency breach\n\nP99 latency climbed above 2s.',
      stream_names: ['logs.checkout'],
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.message).toBe('Checkout latency breach\n\nP99 latency climbed above 2s.');
    expect(inputs.stream_names).toEqual(['logs.checkout']);
  });

  it('falls back to a generic message and empty stream_names when omitted', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-999');

    await makeClient().start({ subject: { type: 'alert', id: 'alert-1' } });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.message).toBe('Investigation requested for alert alert-1');
    expect(inputs.stream_names).toEqual([]);
  });

  it('ensures the investigation agent exists in the space before running the workflow', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    await makeClient().start({ subject: { type: 'alert', id: 'alert-1' } });

    expect(installInvestigationAgentMock).toHaveBeenCalledWith({
      agentBuilder: mockAgentBuilder,
      spaceId: SPACE_ID,
    });
    expect(installInvestigationAgentMock.mock.invocationCallOrder[0]).toBeLessThan(
      mockManagement.runWorkflow.mock.invocationCallOrder[0]
    );
  });

  it('throws InvestigationUnavailableError when the workflow is not installed', async () => {
    mockManagement.getWorkflow.mockResolvedValue(null);

    await expect(makeClient().start({ subject: { type: 'alert', id: 'alert-1' } })).rejects.toThrow(
      InvestigationUnavailableError
    );
  });

  it('throws InvestigationUnavailableError when agentBuilder is not available', async () => {
    const client = new NightshiftInvestigationsClient({
      request: mockRequest,
      workflowsManagement: mockWorkflowsManagement,
      logger: mockLogger,
      spaceIdOverride: SPACE_ID,
      investigationSoClient: mockInvestigationSoClient,
    });

    await expect(client.start({ subject: { type: 'alert', id: 'alert-1' } })).rejects.toThrow(
      InvestigationUnavailableError
    );
  });
});

describe('NightshiftInvestigationsClient.update()', () => {
  it('persists the provided error when status is failed', async () => {
    await makeClient().update('inv-1', {
      status: 'failed',
      error: 'Agent timed out.',
    });

    expect(mockInvestigationSoClient.update).toHaveBeenCalledWith(
      'inv-1',
      expect.objectContaining({ status: 'failed', error: 'Agent timed out.' })
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Agent timed out.'));
  });

  it('persists a generic error when status is failed and no error is provided', async () => {
    await makeClient().update('inv-1', { status: 'failed' });

    expect(mockInvestigationSoClient.update).toHaveBeenCalledWith(
      'inv-1',
      expect.objectContaining({ status: 'failed', error: 'Investigation failed' })
    );
  });

  it('does not persist an error field when status is completed', async () => {
    await makeClient().update('inv-1', {
      status: 'completed',
      summary: 'All clear.',
    });

    expect(mockInvestigationSoClient.update).toHaveBeenCalledWith(
      'inv-1',
      expect.objectContaining({ status: 'completed', summary: 'All clear.' })
    );
    const [, attrs] = mockInvestigationSoClient.update.mock.calls[0];
    expect(attrs).not.toHaveProperty('error');
  });

  it('persists conversation_id and impact', async () => {
    await makeClient().update('inv-1', {
      status: 'completed',
      conversation_id: 'conv-1',
      impact: { entities: [{ name: 'checkout-service' }] },
    });

    expect(mockInvestigationSoClient.update).toHaveBeenCalledWith(
      'inv-1',
      expect.objectContaining({
        status: 'completed',
        conversation_id: 'conv-1',
        impact: { entities: [{ name: 'checkout-service' }] },
      })
    );
  });
});

describe('NightshiftInvestigationsClient.ensureSavedObject()', () => {
  const EXECUTION_ID = 'exec-123';

  const makeExecution = (overrides: Record<string, unknown> = {}) => ({
    id: EXECUTION_ID,
    workflowId: SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
    status: ExecutionStatus.RUNNING,
    startedAt: '2024-01-01T00:00:00Z',
    executedBy: 'workflow-user',
    context: {
      inputs: {
        message: 'Investigate this',
        concurrency_key: 'key-1',
        context: {
          source: 'alert',
          alert_id: 'alert-42',
          trigger_type: 'automatic',
        },
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    mockInvestigationSoClient.findByConcurrencyKey.mockResolvedValue(undefined);
  });

  it('is a no-op when the saved object already exists', async () => {
    mockInvestigationSoClient.get.mockResolvedValue(makeSoAttrs());

    await makeClient().ensureSavedObject(EXECUTION_ID);

    expect(mockManagement.getWorkflowExecution).not.toHaveBeenCalled();
    expect(mockInvestigationSoClient.create).not.toHaveBeenCalled();
  });

  it('creates the saved object from the execution document', async () => {
    mockManagement.getWorkflowExecution.mockResolvedValue(makeExecution());

    await makeClient().ensureSavedObject(EXECUTION_ID);

    expect(mockInvestigationSoClient.create).toHaveBeenCalledWith({
      id: EXECUTION_ID,
      attributes: {
        investigation_id: EXECUTION_ID,
        status: 'running',
        subject_type: 'alert',
        subject_id: 'alert-42',
        trigger_type: 'automatic',
        concurrency_key: 'key-1',
        executed_by: 'workflow-user',
        created_at: '2024-01-01T00:00:00Z',
      },
    });
  });

  it('persists context.summary as subject_summary on the saved object', async () => {
    mockManagement.getWorkflowExecution.mockResolvedValue(
      makeExecution({
        context: {
          inputs: {
            message: 'Investigate this',
            concurrency_key: 'key-1',
            context: {
              source: 'alert',
              alert_id: 'alert-42',
              trigger_type: 'automatic',
              summary: 'CPU saturation on checkout-api',
            },
          },
        },
      })
    );

    await makeClient().ensureSavedObject(EXECUTION_ID);

    expect(mockInvestigationSoClient.create).toHaveBeenCalledWith({
      id: EXECUTION_ID,
      attributes: expect.objectContaining({
        subject_type: 'alert',
        subject_id: 'alert-42',
        subject_summary: 'CPU saturation on checkout-api',
      }),
    });
  });

  it('cancels a superseded running investigation sharing the concurrency key', async () => {
    mockManagement.getWorkflowExecution.mockResolvedValue(makeExecution());
    mockInvestigationSoClient.findByConcurrencyKey.mockResolvedValue({
      id: 'inv-old',
      type: 'nightshift-investigation',
      references: [],
      attributes: makeSoAttrs({ status: 'running', concurrency_key: 'key-1' }),
    });

    await makeClient().ensureSavedObject(EXECUTION_ID);

    expect(mockInvestigationSoClient.update).toHaveBeenCalledWith(
      'inv-old',
      expect.objectContaining({ status: 'cancelled' })
    );
  });

  it('throws InvestigationNotFoundError when the execution does not exist', async () => {
    mockManagement.getWorkflowExecution.mockResolvedValue(null);

    await expect(makeClient().ensureSavedObject(EXECUTION_ID)).rejects.toThrow(
      InvestigationNotFoundError
    );
    expect(mockInvestigationSoClient.create).not.toHaveBeenCalled();
  });

  it('throws InvestigationNotFoundError for an execution of an unrelated workflow', async () => {
    mockManagement.getWorkflowExecution.mockResolvedValue(
      makeExecution({ workflowId: 'some-other-workflow', originManagedWorkflowId: undefined })
    );

    await expect(makeClient().ensureSavedObject(EXECUTION_ID)).rejects.toThrow(
      InvestigationNotFoundError
    );
    expect(mockInvestigationSoClient.create).not.toHaveBeenCalled();
  });

  it('throws InvestigationSubjectMissingError for executions without an investigation subject', async () => {
    mockManagement.getWorkflowExecution.mockResolvedValue(
      makeExecution({ context: { inputs: { message: 'bare run' } } })
    );

    await expect(makeClient().ensureSavedObject(EXECUTION_ID)).rejects.toThrow(
      InvestigationSubjectMissingError
    );
    expect(mockInvestigationSoClient.create).not.toHaveBeenCalled();
  });

  it('tolerates a conflict from a concurrent ensure', async () => {
    mockManagement.getWorkflowExecution.mockResolvedValue(makeExecution());
    mockInvestigationSoClient.create.mockRejectedValue(
      SavedObjectsErrorHelpers.createConflictError('nightshift-investigation', EXECUTION_ID)
    );

    await expect(makeClient().ensureSavedObject(EXECUTION_ID)).resolves.toBeUndefined();
  });
});
