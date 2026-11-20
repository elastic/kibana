/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateExecutionTaskScope } from './generate_execution_task_scope';

describe('generateExecutionTaskScope', () => {
  it('generates scope with workflow and execution IDs', () => {
    const result = generateExecutionTaskScope({
      workflowId: 'wf-1',
      id: 'exec-1',
    } as any);

    expect(result).toEqual(['workflow', 'workflow:wf-1', 'workflow:execution:exec-1']);
  });

  it('includes step scope when stepId is present', () => {
    const result = generateExecutionTaskScope({
      workflowId: 'wf-1',
      id: 'exec-1',
      stepId: 'step-1',
    } as any);

    expect(result).toEqual([
      'workflow',
      'workflow:wf-1',
      'workflow:execution:exec-1',
      'workflow:execution:step:step-1',
    ]);
  });

  it('omits step scope when stepId is absent', () => {
    const result = generateExecutionTaskScope({
      workflowId: 'wf-1',
      id: 'exec-1',
      stepId: undefined,
    } as any);

    expect(result).not.toContainEqual(expect.stringContaining('step:'));
  });
});
