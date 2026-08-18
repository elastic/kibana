/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CASES_WORKFLOW_EXECUTION_CONTEXT_TYPES,
  createAlertWorkflowExecutionContext,
  createAlertsWorkflowExecutionContext,
  createAttachmentWorkflowExecutionContext,
  createCaseWorkflowExecutionContext,
  createCommentWorkflowExecutionContext,
  createObservableWorkflowExecutionContext,
} from '.';

describe('Cases workflow execution contexts', () => {
  it('uses stable one-dot namespaced context types', () => {
    expect(CASES_WORKFLOW_EXECUTION_CONTEXT_TYPES).toEqual([
      'cases.case',
      'cases.observable',
      'cases.alert',
      'cases.alerts',
      'cases.comment',
      'cases.attachment',
    ]);
    expect(
      CASES_WORKFLOW_EXECUTION_CONTEXT_TYPES.every((type) => type.split('.').length === 2)
    ).toBe(true);
  });

  it('keeps case-level context behavior', () => {
    expect(createCaseWorkflowExecutionContext('case-1')).toEqual({
      type: 'cases.case',
      id: 'case-1',
    });
  });

  it.each([
    ['observable', createObservableWorkflowExecutionContext, 'cases.observable'],
    ['alert', createAlertWorkflowExecutionContext, 'cases.alert'],
    ['comment', createCommentWorkflowExecutionContext, 'cases.comment'],
    ['attachment', createAttachmentWorkflowExecutionContext, 'cases.attachment'],
  ] as const)(
    'uses the %s id as primary id and the case as parent',
    (_name, createExecutionContext, type) => {
      expect(createExecutionContext('entity-1', 'case-1')).toEqual({
        type,
        id: 'entity-1',
        parent: {
          type: 'cases.case',
          id: 'case-1',
        },
      });
    }
  );

  it('uses the case id for a bulk alerts collection and its parent', () => {
    expect(createAlertsWorkflowExecutionContext('case-1')).toEqual({
      type: 'cases.alerts',
      id: 'case-1',
      parent: {
        type: 'cases.case',
        id: 'case-1',
      },
    });
  });
});
