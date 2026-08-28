/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { InvestigationStatus } from '../../common';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import {
  InvestigationNotFoundError,
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

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

const mockRequest = {} as KibanaRequest;

const makeExecution = (overrides: Record<string, unknown> = {}) => ({
  workflowId: SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
  status: ExecutionStatus.RUNNING,
  startedAt: '2024-01-01T00:00:00Z',
  finishedAt: undefined as string | undefined,
  context: undefined as Record<string, unknown> | undefined,
  stepExecutions: undefined as Array<{ output: unknown }> | undefined,
  error: undefined as { message: string } | undefined,
  ...overrides,
});

const makeClient = () =>
  new NightshiftInvestigationsClient({
    request: mockRequest,
    workflowsManagement: mockWorkflowsManagement,
    logger: mockLogger,
    spaceIdOverride: SPACE_ID,
    agentBuilder: mockAgentBuilder,
  });

beforeEach(() => {
  jest.clearAllMocks();
  installInvestigationAgentMock.mockResolvedValue(undefined);
});

describe('NightshiftInvestigationsClient.get()', () => {
  describe('not-found guards', () => {
    it('throws InvestigationNotFoundError when execution is null', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(null);
      await expect(makeClient().get('inv-123')).rejects.toThrow(InvestigationNotFoundError);
      await expect(makeClient().get('inv-123')).rejects.toThrow('"inv-123" not found');
    });

    it('throws InvestigationNotFoundError when workflowId does not match', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ workflowId: 'some-other-workflow' })
      );
      await expect(makeClient().get('inv-123')).rejects.toThrow(InvestigationNotFoundError);
    });
  });

  describe('status mapping', () => {
    const cases: Array<[ExecutionStatus, string]> = [
      [ExecutionStatus.PENDING, 'pending'],
      [ExecutionStatus.QUEUED, 'pending'],
      [ExecutionStatus.RUNNING, 'running'],
      [ExecutionStatus.WAITING, 'running'],
      [ExecutionStatus.WAITING_FOR_INPUT, 'running'],
      [ExecutionStatus.WAITING_FOR_CHILD, 'running'],
      [ExecutionStatus.COMPLETED, 'completed'],
      [ExecutionStatus.FAILED, 'failed'],
      [ExecutionStatus.TIMED_OUT, 'failed'],
      [ExecutionStatus.CANCELLED, 'cancelled'],
      [ExecutionStatus.SKIPPED, 'cancelled'],
    ];

    it.each(cases)('%s → %s', async (executionStatus, expectedStatus) => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ status: executionStatus })
      );
      const result = await makeClient().get('inv-1');
      expect(result.status).toBe(expectedStatus);
    });

    it('unknown status defaults to running and logs a warning', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ status: 'totally-unknown' as ExecutionStatus })
      );
      const result = await makeClient().get('inv-1');
      expect(result.status).toBe('running');
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('totally-unknown'));
    });
  });

  describe('subject recovery', () => {
    it('recovers significant_event subject from context.inputs', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          context: {
            inputs: { context: { source: 'significant_event', significant_event_id: 'se-42' } },
          },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.subject).toEqual({ type: 'significant_event', id: 'se-42' });
    });

    it('recovers significant_event subject from direct workflow input', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          context: { inputs: { context: { source: 'significant_event', event_id: 'event-42' } } },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.subject).toEqual({ type: 'significant_event', id: 'event-42' });
    });

    it('recovers alert subject from context.inputs', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          context: { inputs: { context: { source: 'alert', alert_id: 'alert-99' } } },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.subject).toEqual({ type: 'alert', id: 'alert-99' });
    });

    it('prefers the stable event_id over significant_event_id when both are present', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          context: {
            inputs: {
              context: {
                source: 'significant_event',
                event_id: 'checkout-latency-breach',
                significant_event_id: 'event-uuid-1',
              },
            },
          },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.subject).toEqual({
        type: 'significant_event',
        id: 'checkout-latency-breach',
      });
    });

    it('returns no subject when the recovered significant_event id is empty', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          context: {
            inputs: { context: { source: 'significant_event', significant_event_id: '' } },
          },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.subject).toBeUndefined();
    });

    it('returns no subject when context is missing', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(makeExecution());
      const result = await makeClient().get('inv-1');
      expect(result.subject).toBeUndefined();
    });

    it('returns no subject when the source is unrecognized', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ context: { inputs: { context: { source: 'chat' } } } })
      );
      const result = await makeClient().get('inv-1');
      expect(result.subject).toBeUndefined();
    });

    it('recovers trigger_type from context.inputs', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          context: {
            inputs: { context: { source: 'alert', alert_id: 'a-1', trigger_type: 'automatic' } },
          },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.trigger_type).toBe('automatic');
    });

    it('returns no trigger_type when context is missing', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(makeExecution());
      const result = await makeClient().get('inv-1');
      expect(result.trigger_type).toBeUndefined();
    });
  });

  describe('subject reference', () => {
    it('returns the summary verbatim, however long', async () => {
      const long = `${'x'.repeat(400)} and a trailing clause that must not be cut mid-sentence.`;
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          context: {
            inputs: {
              context: {
                source: 'significant_event',
                event_id: 'event-42',
                summary: long,
              },
            },
          },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.subject).toEqual({
        type: 'significant_event',
        id: 'event-42',
        summary: long,
      });
    });

    it('adds the summary to an alert subject', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          context: {
            inputs: {
              context: { source: 'alert', alert_id: 'alert-99', summary: 'CPU saturation' },
            },
          },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.subject).toEqual({
        type: 'alert',
        id: 'alert-99',
        summary: 'CPU saturation',
      });
    });

    it('omits the summary when the caller supplied none', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          context: {
            inputs: {
              message: 'Investigation requested for alert alert-99',
              context: { source: 'alert', alert_id: 'alert-99' },
            },
          },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.subject).toEqual({ type: 'alert', id: 'alert-99' });
    });
  });

  describe('terminal state handling', () => {
    it('sets completed_at when status is completed', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ status: ExecutionStatus.COMPLETED, finishedAt: '2024-01-02T00:00:00Z' })
      );
      const result = await makeClient().get('inv-1');
      expect(result.completed_at).toBe('2024-01-02T00:00:00Z');
    });

    it('does not set completed_at when status is running', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ status: ExecutionStatus.RUNNING, finishedAt: '2024-01-02T00:00:00Z' })
      );
      const result = await makeClient().get('inv-1');
      expect(result.completed_at).toBeUndefined();
    });
  });

  describe('conclusions', () => {
    // The workflow engine wraps ai.agent structured output in a `structured_output` envelope.
    // Real shape: stepExecution.output = { structured_output: { conclusion: '...', summary: '...' } }
    // Confirmed by investigation_workflow.yaml: steps.investigate.output.structured_output.*

    it('returns conclusion from the last step whose structured_output has a conclusion field', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            { output: { structured_output: { conclusion: 'All clear.', summary: 'Summary.' } } },
            { output: { other: 'data' } }, // non-agent step — no structured_output
          ],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBe('All clear.');
    });

    it('prefers the last step with structured_output when multiple steps have it', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            { output: { structured_output: { conclusion: 'First conclusion.' } } },
            { output: { structured_output: { conclusion: 'Last conclusion.' } } },
          ],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBe('Last conclusion.');
    });

    it('falls back to summary when structured_output has summary but no conclusion', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { structured_output: { summary: 'Summary text.' } } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBe('Summary text.');
    });

    it('does not match steps whose output has conclusion at the top level (old/wrong shape)', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { conclusion: 'Flat — should not match.' } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBeUndefined();
    });

    it('returns undefined when no step has structured_output', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { other: 'data' } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBeUndefined();
    });

    it('does not return conclusions when status is not completed', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.RUNNING,
          stepExecutions: [{ output: { structured_output: { conclusion: 'Should be ignored.' } } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusions).toBeUndefined();
    });
  });

  describe('error masking', () => {
    it('returns generic error string (not raw message) when failed', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.FAILED,
          error: { message: 'Internal credential error: secret-token-xyz' },
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.error).toBe('Investigation failed');
      expect(result.error).not.toContain('secret-token-xyz');
    });

    it('does not set error when status is not failed', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({ status: ExecutionStatus.COMPLETED })
      );
      const result = await makeClient().get('inv-1');
      expect(result.error).toBeUndefined();
    });
  });
});

describe('NightshiftInvestigationsClient.list()', () => {
  const makeListResult = (overrides: Record<string, unknown> = {}) => ({
    results: [],
    page: 1,
    size: 20,
    total: 0,
    ...overrides,
  });

  it('uses default page=1 and size=20 when called with no arguments', async () => {
    mockManagement.getWorkflowExecutions.mockResolvedValue(makeListResult());
    await makeClient().list();
    expect(mockManagement.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, size: 20 }),
      SPACE_ID
    );
  });

  it('passes page and size through when provided', async () => {
    mockManagement.getWorkflowExecutions.mockResolvedValue(makeListResult({ page: 3, size: 50 }));
    await makeClient().list({ page: 3, size: 50 });
    expect(mockManagement.getWorkflowExecutions).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, size: 50 }),
      SPACE_ID
    );
  });

  describe('status filter fan-out', () => {
    const cases: Array<[InvestigationStatus, ExecutionStatus[]]> = [
      ['pending', [ExecutionStatus.PENDING, ExecutionStatus.QUEUED]],
      [
        'running',
        [
          ExecutionStatus.RUNNING,
          ExecutionStatus.WAITING,
          ExecutionStatus.WAITING_FOR_INPUT,
          ExecutionStatus.WAITING_FOR_CHILD,
        ],
      ],
      ['completed', [ExecutionStatus.COMPLETED]],
      ['failed', [ExecutionStatus.FAILED, ExecutionStatus.TIMED_OUT]],
      ['cancelled', [ExecutionStatus.CANCELLED, ExecutionStatus.SKIPPED]],
    ];

    it.each(cases)('%s expands to the correct ExecutionStatus values', async (status, expected) => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(makeListResult());
      await makeClient().list({ statuses: [status] });
      expect(mockManagement.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ statuses: expected }),
        SPACE_ID
      );
    });

    it('omits the statuses filter when no statuses are requested', async () => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(makeListResult());
      await makeClient().list({});
      const call = mockManagement.getWorkflowExecutions.mock.calls[0][0];
      expect(call).not.toHaveProperty('statuses');
    });
  });

  describe('sort field mapping', () => {
    it('maps created_at to createdAt', async () => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(makeListResult());
      await makeClient().list({ sort_field: 'created_at' });
      expect(mockManagement.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'createdAt' }),
        SPACE_ID
      );
    });

    it('maps finished_at to finishedAt', async () => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(makeListResult());
      await makeClient().list({ sort_field: 'finished_at' });
      expect(mockManagement.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'finishedAt' }),
        SPACE_ID
      );
    });

    it('defaults to createdAt when sort_field is omitted', async () => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(makeListResult());
      await makeClient().list({});
      expect(mockManagement.getWorkflowExecutions).toHaveBeenCalledWith(
        expect.objectContaining({ sortField: 'createdAt' }),
        SPACE_ID
      );
    });
  });

  describe('terminal state gating for completed_at', () => {
    const makeExecResult = (status: ExecutionStatus, finishedAt?: string) => ({
      id: 'exec-1',
      status,
      startedAt: '2024-01-01T00:00:00Z',
      finishedAt,
      concurrencyGroupKey: undefined,
      executedBy: undefined,
    });

    it.each([
      [ExecutionStatus.COMPLETED, 'completed'],
      [ExecutionStatus.FAILED, 'failed'],
      [ExecutionStatus.TIMED_OUT, 'failed'],
      [ExecutionStatus.CANCELLED, 'cancelled'],
      [ExecutionStatus.SKIPPED, 'cancelled'],
    ])('sets completed_at for terminal status %s', async (execStatus) => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(
        makeListResult({ results: [makeExecResult(execStatus, '2024-01-02T00:00:00Z')] })
      );
      const result = await makeClient().list({});
      expect(result.results[0].completed_at).toBe('2024-01-02T00:00:00Z');
    });

    it.each([
      [ExecutionStatus.PENDING, 'pending'],
      [ExecutionStatus.QUEUED, 'pending'],
      [ExecutionStatus.RUNNING, 'running'],
      [ExecutionStatus.WAITING, 'running'],
      [ExecutionStatus.WAITING_FOR_INPUT, 'running'],
      [ExecutionStatus.WAITING_FOR_CHILD, 'running'],
    ])('omits completed_at for non-terminal status %s', async (execStatus) => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(
        makeListResult({ results: [makeExecResult(execStatus, '2024-01-02T00:00:00Z')] })
      );
      const result = await makeClient().list({});
      expect(result.results[0].completed_at).toBeUndefined();
    });
  });

  it('maps getWorkflowExecutions result to ListInvestigationsResponse shape', async () => {
    const finishedAt = '2024-01-02T00:00:00Z';
    mockManagement.getWorkflowExecutions.mockResolvedValue({
      results: [
        {
          id: 'exec-42',
          status: ExecutionStatus.COMPLETED,
          startedAt: '2024-01-01T00:00:00Z',
          finishedAt,
          concurrencyGroupKey: 'key-1',
          executedBy: 'user-1',
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    });
    const result = await makeClient().list({});
    expect(result).toMatchObject({
      results: [
        {
          investigation_id: 'exec-42',
          status: 'completed',
          started_at: '2024-01-01T00:00:00Z',
          completed_at: finishedAt,
          concurrency_key: 'key-1',
          executed_by: 'user-1',
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    });
  });
});

describe('NightshiftInvestigationsClient.start()', () => {
  const WORKFLOW_ID = SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID;
  const mockWorkflow = { id: WORKFLOW_ID, definition: { steps: [] } };

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
    });

    await expect(client.start({ subject: { type: 'alert', id: 'alert-1' } })).rejects.toThrow(
      InvestigationUnavailableError
    );
  });
});
