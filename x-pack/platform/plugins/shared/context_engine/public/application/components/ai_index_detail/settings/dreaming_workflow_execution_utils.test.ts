/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowLatestExecution } from '../../../hooks/use_latest_workflow_execution';
import { getWorstExecution } from './dreaming_workflow_execution_utils';

const WORKFLOW_A = 'workflow-a';
const WORKFLOW_B = 'workflow-b';
const WORKFLOW_C = 'workflow-c';
const WORKFLOW_D = 'workflow-d';
const WORKFLOW_E = 'workflow-e';

const workflowExecutions = (
  items: Array<Partial<WorkflowLatestExecution['execution']> & { workflowId: string }>
): WorkflowLatestExecution[] =>
  items.map((item) => ({
    workflowId: item.workflowId,
    execution: {
      spaceId: 'default',
      isTestRun: false,
      error: null,
      finishedAt: '2026-11-10T12:01:00.000Z',
      duration: 60000,
      workflowId: item.workflowId,
      id: item.id ?? `exec-${item.workflowId}`,
      status: item.status ?? ExecutionStatus.COMPLETED,
      startedAt: item.startedAt ?? '2026-11-10T12:00:00.000Z',
    },
  }));

describe('dreaming_workflow_execution_utils', () => {
  describe('getWorstExecution', () => {
    it('returns undefined for an empty list', () => {
      expect(getWorstExecution([])).toBeUndefined();
    });

    it('prefers failed over cancelled, skipped, running, and completed', () => {
      const executions = workflowExecutions([
        { workflowId: WORKFLOW_A, id: 'exec-completed', status: ExecutionStatus.COMPLETED },
        { workflowId: WORKFLOW_B, id: 'exec-running', status: ExecutionStatus.RUNNING },
        { workflowId: WORKFLOW_C, id: 'exec-skipped', status: ExecutionStatus.SKIPPED },
        { workflowId: WORKFLOW_D, id: 'exec-cancelled', status: ExecutionStatus.CANCELLED },
        { workflowId: WORKFLOW_E, id: 'exec-failed', status: ExecutionStatus.FAILED },
      ]);

      expect(getWorstExecution(executions)?.execution.id).toBe('exec-failed');
    });

    it('prefers skipped over in progress and in progress over completed', () => {
      const withSkipped = workflowExecutions([
        { workflowId: WORKFLOW_A, id: 'exec-completed', status: ExecutionStatus.COMPLETED },
        { workflowId: WORKFLOW_B, id: 'exec-running', status: ExecutionStatus.RUNNING },
        { workflowId: WORKFLOW_C, id: 'exec-skipped', status: ExecutionStatus.SKIPPED },
      ]);
      const withoutSkipped = workflowExecutions([
        { workflowId: WORKFLOW_A, id: 'exec-completed', status: ExecutionStatus.COMPLETED },
        { workflowId: WORKFLOW_B, id: 'exec-running', status: ExecutionStatus.RUNNING },
      ]);

      expect(getWorstExecution(withSkipped)?.execution.id).toBe('exec-skipped');
      expect(getWorstExecution(withoutSkipped)?.execution.id).toBe('exec-running');
    });

    it('keeps the first execution when ranks are equal', () => {
      const executions = workflowExecutions([
        { workflowId: WORKFLOW_A, id: 'exec-running-first', status: ExecutionStatus.RUNNING },
        { workflowId: WORKFLOW_B, id: 'exec-running-second', status: ExecutionStatus.QUEUED },
      ]);

      expect(getWorstExecution(executions)?.execution.id).toBe('exec-running-first');
    });
  });
});
