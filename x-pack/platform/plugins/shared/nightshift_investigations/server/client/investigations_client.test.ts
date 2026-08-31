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
import { freeFormContextSchema } from '../../common/schemas';
import { installInvestigationAgent } from '../lib/install_investigation_agent';
import {
  InvalidInvestigationContextError,
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
  searchStepExecutions: jest.fn(),
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
  stepExecutions: undefined as
    Array<{ stepId?: string; stepType?: string; startedAt?: string; output: unknown }> | undefined,
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
  mockManagement.searchStepExecutions.mockResolvedValue({ results: [], total: 0 });
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

  describe('conclusion', () => {
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
      expect(result.conclusion).toBe('All clear.');
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
      expect(result.conclusion).toBe('Last conclusion.');
    });

    it('falls back to summary when structured_output has summary but no conclusion', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { structured_output: { summary: 'Summary text.' } } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusion).toBe('Summary text.');
    });

    it('does not match steps whose output has conclusion at the top level (old/wrong shape)', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { conclusion: 'Flat — should not match.' } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusion).toBeUndefined();
    });

    it('returns undefined when no step has structured_output', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { other: 'data' } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusion).toBeUndefined();
    });

    it('does not return conclusion when status is not completed', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.RUNNING,
          stepExecutions: [{ output: { structured_output: { conclusion: 'Should be ignored.' } } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.conclusion).toBeUndefined();
    });
  });

  describe('result', () => {
    // The full agent output, validated against the same schema the workflow declares to the model.
    // The hypotheses, the ES|QL behind each verdict and the recommendations are the expensive part
    // of a run, so a caller that only gets `conclusion` cannot show why the answer is believable.
    const fullState = {
      summary: 'Three candidates investigated.',
      conclusion: 'Pool exhaustion after the pool_max change.',
      hypotheses: [
        {
          candidate: 'pool_max reduced from 80 to 50',
          confidence: 0.97,
          status: 'confirmed',
          reason: 'v2.3.1 saturates at 49 of 50 connections.',
          evidence: [
            {
              description: 'Pool metrics by version.',
              esql_query: 'FROM logs-infra-services | STATS AVG(connections.active) BY version',
              time_range: { from: '2026-08-27T01:00:00Z', to: '2026-08-27T03:40:00Z' },
            },
          ],
        },
        {
          candidate: 'Downstream dependency degradation',
          confidence: 0.05,
          status: 'dismissed',
          reason: 'Neighbouring services sit at their baseline.',
        },
      ],
      blind_spots: [{ title: 'No APM traces', description: 'Could not identify the error class.' }],
      recommendations: [{ title: 'Roll back to v2.1.0', description: 'Restores pool_max to 80.' }],
    };

    it('returns the whole investigation state, not just the conclusion', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { structured_output: fullState } }],
        })
      );

      const result = await makeClient().get('inv-1');

      expect(result.result).toEqual(fullState);
      // A dismissed hypothesis is as much of the record as a confirmed one.
      expect(result.result?.hypotheses.map((h) => h.status)).toEqual(['confirmed', 'dismissed']);
      // Evidence keeps the query and its window, so a reader can re-run it.
      expect(result.result?.hypotheses[0].evidence?.[0].esql_query).toContain('FROM logs-infra');
      expect(result.result?.hypotheses[0].evidence?.[0].time_range?.from).toBe(
        '2026-08-27T01:00:00Z'
      );
    });

    it('keeps the conclusion string alongside the structured result', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { structured_output: fullState } }],
        })
      );

      const result = await makeClient().get('inv-1');

      expect(result.conclusion).toBe('Pool exhaustion after the pool_max change.');
    });

    it('drops output that does not match the schema but still returns the narrative', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            {
              // `hypotheses` is required by the schema and a confidence above 1 is out of range:
              // half-parsed output would be worse than none, because a consumer cannot tell.
              output: {
                structured_output: {
                  summary: 'A summary.',
                  conclusion: 'Still readable.',
                  hypotheses: [{ candidate: 'c', confidence: 42, status: 'confirmed' }],
                },
              },
            },
          ],
        })
      );

      const result = await makeClient().get('inv-1');

      expect(result.result).toBeUndefined();
      expect(result.conclusion).toBe('Still readable.');
    });

    it('does not return a result while the investigation is still running', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.RUNNING,
          stepExecutions: [{ output: { structured_output: fullState } }],
        })
      );

      const result = await makeClient().get('inv-1');

      expect(result.result).toBeUndefined();
    });
  });

  describe('severity', () => {
    it('returns the severity reported in structured_output', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            { output: { structured_output: { summary: 'Summary.', severity: '60-high' } } },
          ],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.severity).toBe('60-high');
    });

    it('returns undefined when structured_output carries no severity', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [{ output: { structured_output: { conclusion: 'All clear.' } } }],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.severity).toBeUndefined();
    });

    it('drops and logs a severity outside the canonical tiers', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            { output: { structured_output: { summary: 'Summary.', severity: 'critical' } } },
          ],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.severity).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('unrecognized severity "critical"')
      );
    });

    it('reads the newest attempt when a retry produced a second investigate step', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            {
              stepId: 'investigate',
              stepType: 'ai.agent',
              startedAt: '2024-01-01T02:00:00Z',
              output: { structured_output: { conclusion: 'Second.', severity: '40-medium' } },
            },
            {
              stepId: 'investigate',
              stepType: 'ai.agent',
              startedAt: '2024-01-01T01:00:00Z',
              output: { structured_output: { conclusion: 'First.', severity: '80-critical' } },
            },
          ],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.severity).toBe('40-medium');
      expect(result.conclusion).toBe('Second.');
    });

    it('ignores the step-level timeout wrapper sharing the investigate step id', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.COMPLETED,
          stepExecutions: [
            {
              stepId: 'investigate',
              stepType: 'step_level_timeout',
              startedAt: '2024-01-01T03:00:00Z',
              output: { structured_output: { severity: '80-critical' } },
            },
            {
              stepId: 'investigate',
              stepType: 'ai.agent',
              startedAt: '2024-01-01T01:00:00Z',
              output: { structured_output: { conclusion: 'Agent.', severity: '20-low' } },
            },
          ],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.severity).toBe('20-low');
    });

    it('does not return severity when status is not completed', async () => {
      mockManagement.getWorkflowExecution.mockResolvedValue(
        makeExecution({
          status: ExecutionStatus.RUNNING,
          stepExecutions: [
            { output: { structured_output: { summary: 'Summary.', severity: '20-low' } } },
          ],
        })
      );
      const result = await makeClient().get('inv-1');
      expect(result.severity).toBeUndefined();
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

  describe('severity', () => {
    const makeSeverityExecResult = (id: string, status: ExecutionStatus) => ({
      id,
      status,
      startedAt: '2024-01-01T00:00:00Z',
      finishedAt: '2024-01-02T00:00:00Z',
      concurrencyGroupKey: undefined,
      executedBy: undefined,
    });

    const makeStep = (
      workflowRunId: string,
      startedAt: string,
      structuredOutput: Record<string, unknown>
    ) => ({
      workflowRunId,
      startedAt,
      stepType: 'ai.agent',
      output: { structured_output: structuredOutput },
    });

    it('maps each investigate step output onto its own investigation', async () => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(
        makeListResult({
          results: [
            makeSeverityExecResult('exec-1', ExecutionStatus.COMPLETED),
            makeSeverityExecResult('exec-2', ExecutionStatus.COMPLETED),
          ],
          total: 2,
        })
      );
      mockManagement.searchStepExecutions.mockResolvedValue({
        results: [
          makeStep('exec-2', '2024-01-01T01:00:00Z', { severity: '20-low' }),
          makeStep('exec-1', '2024-01-01T01:00:00Z', { severity: '80-critical' }),
        ],
        total: 2,
      });

      const result = await makeClient().list({});

      expect(mockManagement.searchStepExecutions).toHaveBeenCalledWith(
        {
          workflowId: SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
          stepId: 'investigate',
          workflowExecutionIds: ['exec-1', 'exec-2'],
          sourceIncludes: [
            'workflowRunId',
            'startedAt',
            'stepType',
            'output.structured_output.severity',
          ],
          size: 8,
        },
        SPACE_ID
      );
      expect(result.results.map(({ severity }) => severity)).toEqual(['80-critical', '20-low']);
    });

    it('keeps the newest attempt when a run produced several', async () => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(
        makeListResult({
          results: [makeSeverityExecResult('exec-1', ExecutionStatus.COMPLETED)],
          total: 1,
        })
      );
      mockManagement.searchStepExecutions.mockResolvedValue({
        results: [
          makeStep('exec-1', '2024-01-01T01:00:00Z', { severity: '80-critical' }),
          makeStep('exec-1', '2024-01-01T02:00:00Z', { severity: '40-medium' }),
        ],
        total: 2,
      });

      const result = await makeClient().list({});
      expect(result.results[0].severity).toBe('40-medium');
    });

    it('ignores the step-level timeout wrapper sharing the investigate step id', async () => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(
        makeListResult({
          results: [makeSeverityExecResult('exec-1', ExecutionStatus.COMPLETED)],
          total: 1,
        })
      );
      mockManagement.searchStepExecutions.mockResolvedValue({
        results: [
          {
            workflowRunId: 'exec-1',
            startedAt: '2024-01-01T03:00:00Z',
            stepType: 'step_level_timeout',
            output: { structured_output: { severity: '80-critical' } },
          },
          makeStep('exec-1', '2024-01-01T01:00:00Z', { severity: '20-low' }),
        ],
        total: 2,
      });

      const result = await makeClient().list({});
      expect(result.results[0].severity).toBe('20-low');
    });

    it('leaves severity unset when the step output carries none', async () => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(
        makeListResult({
          results: [makeSeverityExecResult('exec-1', ExecutionStatus.COMPLETED)],
          total: 1,
        })
      );
      mockManagement.searchStepExecutions.mockResolvedValue({
        results: [makeStep('exec-1', '2024-01-01T01:00:00Z', {})],
        total: 1,
      });

      const result = await makeClient().list({});
      expect(result.results[0].severity).toBeUndefined();
    });

    it('does not search step executions when no investigation on the page completed', async () => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(
        makeListResult({
          results: [
            makeSeverityExecResult('exec-1', ExecutionStatus.RUNNING),
            makeSeverityExecResult('exec-2', ExecutionStatus.FAILED),
          ],
          total: 2,
        })
      );

      const result = await makeClient().list({});

      expect(mockManagement.searchStepExecutions).not.toHaveBeenCalled();
      expect(result.results.every(({ severity }) => severity === undefined)).toBe(true);
    });

    it('returns the list without severities when the severity lookup fails', async () => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(
        makeListResult({
          results: [makeSeverityExecResult('exec-1', ExecutionStatus.COMPLETED)],
          total: 1,
        })
      );
      mockManagement.searchStepExecutions.mockRejectedValue(new Error('step index unavailable'));

      const result = await makeClient().list({});

      expect(result.results).toHaveLength(1);
      expect(result.results[0].severity).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not resolve investigation severities')
      );
    });

    it('warns when the step search returned fewer documents than matched', async () => {
      mockManagement.getWorkflowExecutions.mockResolvedValue(
        makeListResult({
          results: [makeSeverityExecResult('exec-1', ExecutionStatus.COMPLETED)],
          total: 1,
        })
      );
      mockManagement.searchStepExecutions.mockResolvedValue({
        results: [makeStep('exec-1', '2024-01-01T01:00:00Z', { severity: '60-high' })],
        total: 9,
      });

      await makeClient().list({});

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('read 1 of 9 matching step executions')
      );
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

  const alertContext = {
    alerts: [
      {
        id: 'alert-1',
        rule_id: 'rule-1',
        rule_name: 'Latency is too high',
        rule_type_id: 'apm.transaction_duration',
        rule_category: 'Latency threshold',
        reason: 'Latency is 2.5s for service checkout',
        status: 'active',
        start: '2026-08-24T12:00:00.000Z',
        flapping: false,
      },
    ],
  };

  it('calls runWorkflow with the correct inputs and returns investigation_id', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    const result = await makeClient().start({
      subject: { type: 'alert', id: 'alert-1' },
      context: alertContext,
    });

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
      context: alertContext,
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
      context: alertContext,
    });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.context.summary).toBe('CPU saturation on checkout-api');
  });

  it('omits the context summary when none was supplied', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    await makeClient().start({ subject: { type: 'alert', id: 'alert-1' }, context: alertContext });

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

  // Uses a significant event subject: an alert investigation cannot reach the generic fallback
  // any more, because it is rejected without the alert data the brief is composed from.
  it('falls back to a generic message and empty stream_names when omitted', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-999');

    await makeClient().start({ subject: { type: 'significant_event', id: 'se-1' } });

    const [, , inputs] = mockManagement.runWorkflow.mock.calls[0];
    expect(inputs.message).toBe('Investigation requested for significant_event se-1');
    expect(inputs.stream_names).toEqual([]);
  });

  it('ensures the investigation agent exists in the space before running the workflow', async () => {
    mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
    mockManagement.runWorkflow.mockResolvedValue('exec-123');

    await makeClient().start({ subject: { type: 'alert', id: 'alert-1' }, context: alertContext });

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

    await expect(
      makeClient().start({ subject: { type: 'significant_event', id: 'se-1' } })
    ).rejects.toThrow(InvestigationUnavailableError);
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

  // The route schema also enforces this, but the workflow step definition and the plugin start
  // contract reach start() directly, and the step types its context as a plain record.
  describe('alert context validation', () => {
    it.each([
      ['no context at all', undefined],
      ['a context with no alerts key', { source: 'alert' }],
      ['an empty alerts array', { alerts: [] }],
      ['an alert missing required fields', { alerts: [{ id: 'alert-1' }] }],
      ['an alert whose evaluation is the wrong shape', { alerts: [{ evaluation: { value: {} } }] }],
    ])('rejects an alert investigation with %s', async (_label, context) => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

      await expect(
        makeClient().start({ subject: { type: 'alert', id: 'alert-1' }, context })
      ).rejects.toThrow(InvalidInvestigationContextError);
      expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
    });

    // Without this, `event_uuid` reaches the workflow's attach steps and files an alert's findings
    // against a significant event.
    it.each([['event_uuid'], ['stream_names'], ['source']])(
      'rejects an alert investigation whose context also carries %s',
      async (key) => {
        mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

        await expect(
          makeClient().start({
            subject: { type: 'alert', id: 'alert-1' },
            context: { ...alertContext, [key]: 'whatever' },
          })
        ).rejects.toThrow(InvalidInvestigationContextError);
        expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
      }
    );

    it('names the offending keys and fields so the caller can see what was rejected', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

      await expect(
        makeClient().start({
          subject: { type: 'alert', id: 'alert-1' },
          context: { ...alertContext, event_uuid: 'se-1', severity: 'high' },
        })
      ).rejects.toThrow(/event_uuid[\s\S]*severity/);
    });

    it('reports which snapshot field was wrong rather than a bare rejection', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

      await expect(
        makeClient().start({
          subject: { type: 'alert', id: 'alert-1' },
          context: { alerts: [{ ...alertContext.alerts[0], flapping: 'nope' }] },
        })
      ).rejects.toThrow(/flapping/);
    });

    // The workflow interpolates context.event_uuid into an internal request path, so a value that
    // is not id-shaped could point the attach steps at a different endpoint. Everything else in a
    // significant-event context stays open, because that payload belongs to another plugin.
    it.each([
      ['a path separator', 'events/../../other'],
      ['a parent-directory segment', '..'],
      ['a query string', 'abc?expand=true'],
      ['a fragment', 'abc#frag'],
      ['an empty string', ''],
    ])('rejects a significant event context whose event_uuid carries %s', async (_label, uuid) => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);

      await expect(
        makeClient().start({
          subject: { type: 'significant_event', id: 'se-1' },
          context: { event_uuid: uuid },
        })
      ).rejects.toThrow(InvalidInvestigationContextError);
      expect(mockManagement.runWorkflow).not.toHaveBeenCalled();
    });

    // A non-string cannot travel through `start`'s typed signature, so it is asserted against the
    // schema directly. This is the shape an untyped caller sends: a JSON body, or a workflow step
    // whose input schema is a record of unknown.
    it('rejects an event_uuid that is not a string at all', () => {
      expect(freeFormContextSchema.safeParse({ event_uuid: { nested: true } }).success).toBe(false);
    });

    it('accepts the uuid shape the significant events plugin actually sends', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      mockManagement.runWorkflow.mockResolvedValue('exec-791');

      await expect(
        makeClient().start({
          subject: { type: 'significant_event', id: 'se-1' },
          context: { event_uuid: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' },
        })
      ).resolves.toEqual({ investigation_id: 'exec-791' });
    });

    it('leaves the free-form context of a significant event subject alone', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      mockManagement.runWorkflow.mockResolvedValue('exec-790');

      await expect(
        makeClient().start({
          subject: { type: 'significant_event', id: 'se-1' },
          context: { event_uuid: 'se-1', severity: 'high' },
        })
      ).resolves.toEqual({ investigation_id: 'exec-790' });
    });

    it('does not require alerts for a significant event subject', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      mockManagement.runWorkflow.mockResolvedValue('exec-789');

      await expect(
        makeClient().start({ subject: { type: 'significant_event', id: 'se-1' } })
      ).resolves.toEqual({ investigation_id: 'exec-789' });
    });

    it('builds the brief from the snapshot rather than the bare subject id', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      mockManagement.runWorkflow.mockResolvedValue('exec-321');

      await makeClient().start({
        subject: { type: 'alert', id: 'alert-1' },
        context: alertContext,
      });

      const inputs = mockManagement.runWorkflow.mock.calls[0][2];
      expect(inputs.message).toContain('Latency is too high');
      expect(inputs.message).not.toBe('Investigation requested for alert alert-1');
    });

    // The composed brief is only for alert subjects; a caller-supplied message still wins
    // everywhere else, which is the behaviour every non-alert caller already relies on.
    it('keeps the caller-supplied message for a significant event subject', async () => {
      mockManagement.getWorkflow.mockResolvedValue(mockWorkflow);
      mockManagement.runWorkflow.mockResolvedValue('exec-654');

      await makeClient().start({
        subject: { type: 'significant_event', id: 'se-1' },
        message: 'Checkout latency breach',
        context: { alerts: [alertContext.alerts[0]] },
      });

      const inputs = mockManagement.runWorkflow.mock.calls[0][2];
      expect(inputs.message).toBe('Checkout latency breach');
    });
  });
});
