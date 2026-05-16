/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ExecutionStatus,
  WorkflowExecutionDto,
  WorkflowStepExecutionDto,
} from '@kbn/workflows';
import {
  SML_INDEX_AUGMENTATION_WORKFLOW_ID,
  SML_INDEX_CRAWL_LIST_STEP,
  SML_INDEX_CRAWL_WORKFLOW_ID,
} from '../../common/constants';
import { computeSmlWorkflowProgress } from './compute_progress';

/**
 * `ExecutionStatus` is a string enum union; the fixtures here use string
 * literals for readability. Funnel everything through a tiny cast helper so
 * a future widening of `ExecutionStatus` continues to compile without
 * sprinkling `as ExecutionStatus` across every fixture call site.
 */
type StepOverrides = Omit<Partial<WorkflowStepExecutionDto>, 'status'> & { status?: string };
type ExecutionOverrides = Omit<Partial<WorkflowExecutionDto>, 'status'> & { status?: string };

const buildStep = (overrides: StepOverrides = {}): WorkflowStepExecutionDto => {
  const { status: rawStatus, ...rest } = overrides;
  return {
    id: 'step-exec-1',
    stepId: 'unknown',
    workflowRunId: 'run-1',
    workflowId: 'wf',
    status: (rawStatus ?? 'completed') as ExecutionStatus,
    startedAt: '2026-05-12T10:00:00.000Z',
    finishedAt: '2026-05-12T10:00:01.000Z',
    topologicalIndex: 0,
    globalExecutionIndex: 0,
    stepExecutionIndex: 0,
    scopeStack: [],
    ...rest,
  } as unknown as WorkflowStepExecutionDto;
};

const buildExecution = (overrides: ExecutionOverrides = {}): WorkflowExecutionDto => {
  const { status: rawStatus, ...rest } = overrides;
  return {
    spaceId: 'default',
    id: 'exec-1',
    status: (rawStatus ?? 'running') as ExecutionStatus,
    isTestRun: false,
    startedAt: '2026-05-12T10:00:00.000Z',
    error: null,
    finishedAt: '',
    workflowId: 'unknown',
    workflowDefinition: { name: 'unknown', triggers: [], steps: [], version: '1' as const },
    stepExecutions: [],
    duration: null,
    yaml: '',
    ...rest,
  } as unknown as WorkflowExecutionDto;
};

describe('computeSmlWorkflowProgress', () => {
  describe('unknown workflow', () => {
    it('returns undefined for executions that are not SML system workflows', () => {
      const result = computeSmlWorkflowProgress({
        execution: buildExecution({ workflowId: 'some-user-workflow' }),
      });
      expect(result).toBeUndefined();
    });

    it('returns undefined when workflowId is missing', () => {
      const result = computeSmlWorkflowProgress({
        execution: buildExecution({ workflowId: undefined }),
      });
      expect(result).toBeUndefined();
    });
  });

  describe('crawl workflow', () => {
    const crawlExecution = (stepOverrides: StepOverrides[] = []): WorkflowExecutionDto =>
      buildExecution({
        workflowId: SML_INDEX_CRAWL_WORKFLOW_ID,
        stepExecutions: stepOverrides.map(buildStep),
      });

    it('returns total=null and completed=0 before list_indices has run', () => {
      const result = computeSmlWorkflowProgress({
        execution: crawlExecution([]),
      });
      expect(result).toEqual({
        kind: 'crawl',
        total: null,
        completed: 0,
        currentIndex: null,
      });
    });

    it('derives total from the list_indices step output length', () => {
      const result = computeSmlWorkflowProgress({
        execution: crawlExecution([
          {
            stepId: SML_INDEX_CRAWL_LIST_STEP,
            status: 'completed',
            output: [
              { index: 'logs-app-1' },
              { index: 'logs-app-2' },
              { index: 'logs-app-3' },
            ],
          },
        ]),
      });
      expect(result).toEqual({
        kind: 'crawl',
        total: 3,
        completed: 0,
        currentIndex: null,
      });
    });

    it('returns total=null if list_indices output is not an array (e.g. error body)', () => {
      const result = computeSmlWorkflowProgress({
        execution: crawlExecution([
          {
            stepId: SML_INDEX_CRAWL_LIST_STEP,
            status: 'completed',
            output: { error: 'boom' } as unknown as never,
          },
        ]),
      });
      expect(result?.kind).toBe('crawl');
      expect((result as { total: number | null }).total).toBeNull();
    });

    it('counts terminal workflow.execute step executions toward `completed`', () => {
      const result = computeSmlWorkflowProgress({
        execution: crawlExecution([
          {
            stepId: SML_INDEX_CRAWL_LIST_STEP,
            status: 'completed',
            output: [
              { index: 'idx-1' },
              { index: 'idx-2' },
              { index: 'idx-3' },
              { index: 'idx-4' },
            ],
          },
          {
            stepId: 'run_augmentation',
            stepType: 'workflow.execute',
            status: 'completed',
            input: { inputs: { indexPattern: 'idx-1' } },
          },
          {
            stepId: 'run_augmentation',
            stepType: 'workflow.execute',
            status: 'failed',
            input: { inputs: { indexPattern: 'idx-2' } },
          },
          {
            stepId: 'run_augmentation',
            stepType: 'workflow.execute',
            status: 'running',
            input: { inputs: { indexPattern: 'idx-3' } },
          },
        ]),
      });
      // 'completed' + 'failed' are terminal; 'running' is not.
      expect(result).toMatchObject({ kind: 'crawl', total: 4, completed: 2 });
    });

    it('reports the in-flight workflow.execute step input as currentIndex', () => {
      const result = computeSmlWorkflowProgress({
        execution: crawlExecution([
          {
            stepId: SML_INDEX_CRAWL_LIST_STEP,
            status: 'completed',
            output: [{ index: 'a' }, { index: 'b' }],
          },
          {
            stepId: 'run_augmentation',
            stepType: 'workflow.execute',
            status: 'completed',
            input: { inputs: { indexPattern: 'a' } },
            startedAt: '2026-05-12T10:00:01.000Z',
          },
          {
            // `waiting` is the typical status while the spawned child runs.
            stepId: 'run_augmentation',
            stepType: 'workflow.execute',
            status: 'waiting',
            input: { inputs: { indexPattern: 'logs-active' } },
            startedAt: '2026-05-12T10:00:05.000Z',
          },
        ]),
      });
      expect(result).toMatchObject({
        kind: 'crawl',
        total: 2,
        completed: 1,
        currentIndex: 'logs-active',
      });
    });

    it('falls back to null currentIndex when no workflow.execute step is in flight', () => {
      const result = computeSmlWorkflowProgress({
        execution: crawlExecution([
          {
            stepId: 'run_augmentation',
            stepType: 'workflow.execute',
            status: 'completed',
            input: { inputs: { indexPattern: 'a' } },
          },
        ]),
      });
      expect((result as { currentIndex: string | null }).currentIndex).toBeNull();
    });

    it('uses the most recently started list_indices step when there are retries', () => {
      const result = computeSmlWorkflowProgress({
        execution: crawlExecution([
          {
            stepId: SML_INDEX_CRAWL_LIST_STEP,
            status: 'failed',
            startedAt: '2026-05-12T10:00:00.000Z',
            output: undefined,
          },
          {
            stepId: SML_INDEX_CRAWL_LIST_STEP,
            status: 'completed',
            startedAt: '2026-05-12T10:00:05.000Z',
            output: [{ index: 'a' }, { index: 'b' }],
          },
        ]),
      });
      expect(result).toMatchObject({ kind: 'crawl', total: 2 });
    });
  });

  describe('augmentation workflow', () => {
    const augmentation = (
      ctx: Record<string, unknown> | undefined,
      stepOverrides: StepOverrides[] = []
    ): WorkflowExecutionDto =>
      buildExecution({
        workflowId: SML_INDEX_AUGMENTATION_WORKFLOW_ID,
        context: ctx,
        stepExecutions: stepOverrides.map(buildStep),
      });

    it('returns the indexPattern from context.inputs', () => {
      const result = computeSmlWorkflowProgress({
        execution: augmentation({ inputs: { indexPattern: 'logs-app-*' } }),
      });
      expect(result).toMatchObject({
        kind: 'augmentation',
        indexPattern: 'logs-app-*',
        currentStep: null,
      });
    });

    it('falls back to context.workflow.inputs.indexPattern', () => {
      const result = computeSmlWorkflowProgress({
        execution: augmentation({ workflow: { inputs: { indexPattern: 'metrics-*' } } }),
      });
      expect((result as { indexPattern: string | null }).indexPattern).toBe('metrics-*');
    });

    it('falls back to step input when context is empty', () => {
      const result = computeSmlWorkflowProgress({
        execution: augmentation({}, [
          {
            stepId: 'enterWorkflow',
            input: { inputs: { indexPattern: 'traces-*' } },
          },
        ]),
      });
      expect((result as { indexPattern: string | null }).indexPattern).toBe('traces-*');
    });

    it('returns null indexPattern when nothing is resolvable', () => {
      const result = computeSmlWorkflowProgress({
        execution: augmentation(undefined),
      });
      expect((result as { indexPattern: string | null }).indexPattern).toBeNull();
    });

    it('prefers an active step over a completed one for currentStep', () => {
      const result = computeSmlWorkflowProgress({
        execution: augmentation({ inputs: { indexPattern: 'x' } }, [
          {
            stepId: 'get_index_mappings',
            status: 'completed',
            startedAt: '2026-05-12T10:00:00.000Z',
          },
          {
            stepId: 'extract_kpis',
            status: 'running',
            startedAt: '2026-05-12T10:00:01.000Z',
          },
        ]),
      });
      expect((result as { currentStep: string | null }).currentStep).toBe('extract_kpis');
    });

    it('falls back to the most recently started step when nothing is active', () => {
      const result = computeSmlWorkflowProgress({
        execution: augmentation({ inputs: { indexPattern: 'x' } }, [
          {
            stepId: 'get_index_mappings',
            status: 'completed',
            startedAt: '2026-05-12T10:00:00.000Z',
          },
          {
            stepId: 'extract_kpis',
            status: 'completed',
            startedAt: '2026-05-12T10:00:01.000Z',
          },
          {
            stepId: 'index_each_kpi',
            status: 'completed',
            startedAt: '2026-05-12T10:00:02.000Z',
          },
        ]),
      });
      expect((result as { currentStep: string | null }).currentStep).toBe('index_each_kpi');
    });
  });
});
