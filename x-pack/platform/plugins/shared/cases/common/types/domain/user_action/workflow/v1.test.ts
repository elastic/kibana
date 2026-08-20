/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowUserActionSchema } from '../../../domain_zod/user_action/workflow/v1';
import { CaseUserActionWithoutReferenceIdsSchema } from '../../../domain_zod/user_action/v1';
import { UserActionTypes } from '../action/v1';
import { CaseUserActionWithoutReferenceIdsRt } from '../v1';
import { WorkflowUserActionRt } from './v1';

const workflowUserAction = {
  type: UserActionTypes.workflow,
  payload: {
    workflow: {
      id: 'workflow-1',
      name: 'Investigate case',
      executionId: 'execution-1',
    },
    origin: {
      type: 'cases.observable',
      id: 'observable-1',
    },
  },
};

describe('Workflow user action', () => {
  it('decodes the workflow payload with io-ts', () => {
    expect(WorkflowUserActionRt.decode(workflowUserAction)).toEqual({
      _tag: 'Right',
      right: workflowUserAction,
    });
  });

  it('parses the workflow payload with zod', () => {
    expect(WorkflowUserActionSchema.parse(workflowUserAction)).toEqual(workflowUserAction);
  });

  it('accepts a bulk alerts origin', () => {
    const bulkAlertsUserAction = {
      ...workflowUserAction,
      payload: {
        ...workflowUserAction.payload,
        origin: {
          type: 'cases.alerts',
          id: 'case-1',
        },
      },
    };

    expect(WorkflowUserActionRt.decode(bulkAlertsUserAction)._tag).toBe('Right');
    expect(WorkflowUserActionSchema.parse(bulkAlertsUserAction)).toEqual(bulkAlertsUserAction);
  });

  it('accepts workflow origin display and navigation fields', () => {
    const enrichedUserAction = {
      ...workflowUserAction,
      payload: {
        ...workflowUserAction.payload,
        origin: {
          ...workflowUserAction.payload.origin,
          index: '.alerts-security.alerts-default',
          typeKey: 'ip',
          value: '10.0.0.8',
        },
      },
    };

    expect(WorkflowUserActionRt.decode(enrichedUserAction)).toEqual({
      _tag: 'Right',
      right: enrichedUserAction,
    });
    expect(WorkflowUserActionSchema.parse(enrichedUserAction)).toEqual(enrichedUserAction);
  });

  it('strips unknown workflow fields in both schemas', () => {
    const input = {
      ...workflowUserAction,
      payload: {
        workflow: {
          ...workflowUserAction.payload.workflow,
          ignored: true,
        },
        origin: {
          ...workflowUserAction.payload.origin,
          ignored: true,
        },
      },
    };

    expect(WorkflowUserActionRt.decode(input)).toEqual({
      _tag: 'Right',
      right: workflowUserAction,
    });
    expect(WorkflowUserActionSchema.parse(input)).toEqual(workflowUserAction);
  });

  it('rejects unsupported origin types', () => {
    const input = {
      ...workflowUserAction,
      payload: {
        ...workflowUserAction.payload,
        origin: {
          type: 'cases.unsupported',
          id: 'entity-1',
        },
      },
    };

    expect(WorkflowUserActionRt.decode(input)._tag).toBe('Left');
    expect(() => WorkflowUserActionSchema.parse(input)).toThrow();
  });

  it('is included in the persisted user action unions', () => {
    const persistedUserAction = {
      ...workflowUserAction,
      action: 'create',
      created_at: '2026-08-18T12:00:00.000Z',
      created_by: {
        email: 'elastic@elastic.co',
        full_name: 'Elastic User',
        username: 'elastic',
      },
      owner: 'cases',
    };

    expect(CaseUserActionWithoutReferenceIdsRt.decode(persistedUserAction)).toEqual({
      _tag: 'Right',
      right: persistedUserAction,
    });
    expect(CaseUserActionWithoutReferenceIdsSchema.parse(persistedUserAction)).toEqual(
      persistedUserAction
    );
  });
});
