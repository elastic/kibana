/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';
import {
  refuseDelegatedIdentityWorkflow,
  refuseStandaloneDelegatedIdentityRun,
} from './refuse_standalone_delegated_identity';

const delegatedWorkflow = {
  id: 'system-security-attack-discovery-worker',
  definition: {
    steps: [
      {
        name: 'run_generation',
        type: 'workflow.execute',
        with: { 'workflow-id': 'child', 'run-as-mode': 'inherit' },
      },
    ],
  },
} as WorkflowExecutionEngineModel;

const ownedWorkflow = {
  id: 'per-space-worker',
  definition: {
    settings: { run_as: 'workflow:attack-discovery' },
    steps: [
      {
        name: 'run_generation',
        type: 'workflow.execute',
        with: { 'workflow-id': 'child', 'run-as-mode': 'inherit' },
      },
    ],
  },
} as WorkflowExecutionEngineModel;

describe('refuseStandaloneDelegatedIdentityRun', () => {
  it('rejects a standalone delegated-identity workflow', () => {
    expect(() => refuseStandaloneDelegatedIdentityRun(delegatedWorkflow, {})).toThrow(
      Boom.forbidden(
        "Workflow 'system-security-attack-discovery-worker' delegates its execution identity to a parent workflow and cannot be run standalone."
      )
    );
  });

  it('allows the same workflow when the run inherits a parent identity', () => {
    expect(() =>
      refuseStandaloneDelegatedIdentityRun(delegatedWorkflow, { inheritParentIdentity: true })
    ).not.toThrow();
  });

  it('allows a workflow that has its own service account', () => {
    expect(() => refuseStandaloneDelegatedIdentityRun(ownedWorkflow, {})).not.toThrow();
  });
});

describe('refuseDelegatedIdentityWorkflow', () => {
  it('rejects a delegated-identity workflow even when a caller sets the inherit flag', () => {
    expect(() => refuseDelegatedIdentityWorkflow(delegatedWorkflow)).toThrow(
      /cannot be run standalone/
    );
  });
});
