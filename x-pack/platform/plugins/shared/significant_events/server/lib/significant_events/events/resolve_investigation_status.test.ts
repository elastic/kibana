/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import { INVESTIGATE_STEP_ID, type InvestigationState } from '@kbn/significant-events-schema';
import { resolveStatusFromExecution } from './resolve_investigation_status';

const investigationState: InvestigationState = {
  summary: 'Investigate the latency spike.',
  hypotheses: [{ candidate: 'Checkout deploy regression', confidence: 0.9, status: 'confirmed' }],
};

const execution = (
  status: ExecutionStatus,
  stepExecutions: Array<Partial<WorkflowExecutionDto['stepExecutions'][number]>> = []
): Pick<WorkflowExecutionDto, 'status' | 'stepExecutions'> =>
  ({ status, stepExecutions } as Pick<WorkflowExecutionDto, 'status' | 'stepExecutions'>);

describe('resolveStatusFromExecution', () => {
  it.each([ExecutionStatus.PENDING, ExecutionStatus.RUNNING, ExecutionStatus.WAITING])(
    'reports pending while the execution is %s',
    (status) => {
      expect(resolveStatusFromExecution(execution(status))).toBe('pending');
    }
  );

  it('reports complete when the investigate step produced a parseable result', () => {
    expect(
      resolveStatusFromExecution(
        execution(ExecutionStatus.COMPLETED, [
          { stepId: INVESTIGATE_STEP_ID, output: { structured_output: investigationState } },
        ])
      )
    ).toBe('complete');
  });

  it('reports failed when the investigate step errored', () => {
    expect(
      resolveStatusFromExecution(
        execution(ExecutionStatus.FAILED, [
          { stepId: INVESTIGATE_STEP_ID, error: { type: 'Error', message: 'boom' } },
        ])
      )
    ).toBe('failed');
  });

  it('reports failed for a terminal execution that did not complete', () => {
    expect(resolveStatusFromExecution(execution(ExecutionStatus.TIMED_OUT))).toBe('failed');
  });

  it('reports pending for a completed execution whose output has not been persisted yet', () => {
    expect(resolveStatusFromExecution(execution(ExecutionStatus.COMPLETED))).toBe('pending');
  });

  it('reports pending when the persisted output does not match the investigation schema', () => {
    expect(
      resolveStatusFromExecution(
        execution(ExecutionStatus.COMPLETED, [
          { stepId: INVESTIGATE_STEP_ID, output: { structured_output: { nope: true } } },
        ])
      )
    ).toBe('pending');
  });

  it('takes the last attempt when the investigate step was retried', () => {
    expect(
      resolveStatusFromExecution(
        execution(ExecutionStatus.COMPLETED, [
          {
            stepId: INVESTIGATE_STEP_ID,
            stepExecutionIndex: 0,
            error: { type: 'Error', message: 'first attempt died' },
          },
          {
            stepId: INVESTIGATE_STEP_ID,
            stepExecutionIndex: 1,
            output: { structured_output: investigationState },
          },
        ])
      )
    ).toBe('complete');
  });

  it('reports failed when the last attempt of a retried investigate step errored', () => {
    expect(
      resolveStatusFromExecution(
        execution(ExecutionStatus.COMPLETED, [
          {
            stepId: INVESTIGATE_STEP_ID,
            stepExecutionIndex: 1,
            error: { type: 'Error', message: 'retry died too' },
          },
          {
            stepId: INVESTIGATE_STEP_ID,
            stepExecutionIndex: 0,
            output: { structured_output: investigationState },
          },
        ])
      )
    ).toBe('failed');
  });

  it('ignores step executions from other steps', () => {
    expect(
      resolveStatusFromExecution(
        execution(ExecutionStatus.COMPLETED, [
          { stepId: 'some_other_step', output: { structured_output: investigationState } },
        ])
      )
    ).toBe('pending');
  });
});
