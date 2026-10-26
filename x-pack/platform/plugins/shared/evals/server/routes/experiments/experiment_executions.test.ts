/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { extractProgress, isEvalsExperimentExecution } from './experiment_executions';
import { EVALS_EXPERIMENT_WORKFLOW_TAG } from '../../../common/experiments/run_experiment';

type StepProgressInput = Pick<WorkflowStepExecutionDto, 'output' | 'state'>;

const asStep = (step: Partial<StepProgressInput>): StepProgressInput => step as StepProgressInput;

const asExecution = (tags?: string[]): Pick<WorkflowExecutionDto, 'workflowDefinition'> =>
  ({
    workflowDefinition: tags === undefined ? undefined : { tags },
  } as unknown as Pick<WorkflowExecutionDto, 'workflowDefinition'>);

describe('extractProgress', () => {
  it('reads the authoritative counters from a completed step output', () => {
    expect(
      extractProgress(
        asStep({
          output: {
            experiment_id: 'exp-1',
            example_count: 3,
            completed: 2,
            failed: 1,
            scores_ingested: 4,
          },
        })
      )
    ).toEqual({ total: 3, completed: 2, failed: 1, scores_ingested: 4 });
  });

  it('reads live counters from the durable poll state while running', () => {
    expect(
      extractProgress(
        asStep({
          state: {
            __durableStepState: {
              customState: {
                work: [{}, {}, {}],
                cursor: 1,
                completed: 1,
                failed: 0,
                scores_ingested: 2,
              },
            },
          },
        })
      )
    ).toEqual({ total: 3, completed: 1, failed: 0, scores_ingested: 2 });
  });

  it('prefers the terminal output over a stale live-state snapshot', () => {
    expect(
      extractProgress(
        asStep({
          output: { example_count: 1, completed: 0, failed: 1, scores_ingested: 0 },
          state: {
            __durableStepState: {
              customState: {
                work: [{}],
                completed: 5,
                failed: 0,
                scores_ingested: 9,
              },
            },
          },
        })
      )
    ).toEqual({ total: 1, completed: 0, failed: 1, scores_ingested: 0 });
  });

  it('surfaces captured failure messages from a completed step output', () => {
    expect(
      extractProgress(
        asStep({
          output: {
            example_count: 1,
            completed: 0,
            failed: 1,
            scores_ingested: 0,
            errors: ['Example "ex-1" (repetition 0): boom'],
          },
        })
      )
    ).toEqual({
      total: 1,
      completed: 0,
      failed: 1,
      scores_ingested: 0,
      errors: ['Example "ex-1" (repetition 0): boom'],
    });
  });

  it('surfaces captured failure messages from the live poll state', () => {
    expect(
      extractProgress(
        asStep({
          state: {
            __durableStepState: {
              customState: {
                work: [{}],
                cursor: 0,
                completed: 0,
                failed: 1,
                scores_ingested: 0,
                errors: ['boom'],
              },
            },
          },
        })
      )
    ).toEqual({ total: 1, completed: 0, failed: 1, scores_ingested: 0, errors: ['boom'] });
  });

  it('omits errors when the captured list is empty', () => {
    const progress = extractProgress(
      asStep({
        output: { example_count: 1, completed: 1, failed: 0, scores_ingested: 1, errors: [] },
      })
    );
    expect(progress).toEqual({ total: 1, completed: 1, failed: 0, scores_ingested: 1 });
    expect(progress?.errors).toBeUndefined();
  });

  it('returns undefined when there is nothing to report', () => {
    expect(extractProgress(asStep({}))).toBeUndefined();
    expect(extractProgress(asStep({ output: {}, state: {} }))).toBeUndefined();
    expect(
      extractProgress(asStep({ state: { __durableStepState: { customState: {} } } }))
    ).toBeUndefined();
  });
});

describe('isEvalsExperimentExecution', () => {
  it('accepts an execution whose workflow definition carries the evals experiment tag', () => {
    expect(isEvalsExperimentExecution(asExecution(['evals', EVALS_EXPERIMENT_WORKFLOW_TAG]))).toBe(
      true
    );
  });

  it("rejects another feature's execution that lacks the evals experiment tag", () => {
    expect(isEvalsExperimentExecution(asExecution(['some-other-feature']))).toBe(false);
    expect(isEvalsExperimentExecution(asExecution(['evals']))).toBe(false);
    expect(isEvalsExperimentExecution(asExecution([]))).toBe(false);
  });

  it('fails closed when the execution has no workflow definition or tags', () => {
    expect(isEvalsExperimentExecution(asExecution(undefined))).toBe(false);
    expect(isEvalsExperimentExecution({} as Pick<WorkflowExecutionDto, 'workflowDefinition'>)).toBe(
      false
    );
  });
});
