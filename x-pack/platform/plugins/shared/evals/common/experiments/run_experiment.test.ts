/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowDetailDto } from '@kbn/workflows';
import { EVALS_EXPERIMENT_WORKFLOW_TAG, isEvalsOwnedWorkflow } from './run_experiment';

const asWorkflow = (tags?: string[]): Pick<WorkflowDetailDto, 'definition'> =>
  ({
    definition: tags === undefined ? null : { tags },
  } as unknown as Pick<WorkflowDetailDto, 'definition'>);

describe('isEvalsOwnedWorkflow', () => {
  it('accepts a workflow whose definition carries the evals experiment tag', () => {
    expect(isEvalsOwnedWorkflow(asWorkflow(['evals', EVALS_EXPERIMENT_WORKFLOW_TAG]))).toBe(true);
  });

  it("rejects another feature's workflow that lacks the evals experiment tag", () => {
    expect(isEvalsOwnedWorkflow(asWorkflow(['some-other-feature']))).toBe(false);
    expect(isEvalsOwnedWorkflow(asWorkflow(['evals']))).toBe(false);
    expect(isEvalsOwnedWorkflow(asWorkflow([]))).toBe(false);
  });

  it('fails closed when the workflow is missing, or has no definition or tags', () => {
    expect(isEvalsOwnedWorkflow(null)).toBe(false);
    expect(isEvalsOwnedWorkflow(undefined)).toBe(false);
    expect(isEvalsOwnedWorkflow(asWorkflow(undefined))).toBe(false);
    expect(isEvalsOwnedWorkflow({} as Pick<WorkflowDetailDto, 'definition'>)).toBe(false);
  });
});
