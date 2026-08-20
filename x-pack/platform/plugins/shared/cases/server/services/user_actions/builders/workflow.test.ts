/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../../../../common/types/domain';
import { BuilderFactory } from '../builder_factory';
import type { UserActionParameters } from '../types';

describe('WorkflowUserActionBuilder', () => {
  const args: UserActionParameters<'workflow'> = {
    caseId: 'case-1',
    owner: 'cases',
    user: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic User',
      username: 'elastic',
    },
    payload: {
      workflow: {
        id: 'workflow-1',
        name: 'Investigate case',
        executionId: 'execution-1',
      },
      origin: {
        type: 'cases.alert',
        id: 'alert-1',
      },
    },
  };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-18T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('builds a standalone workflow activity', () => {
    const result = new BuilderFactory().getBuilder(UserActionTypes.workflow)?.build(args);

    expect(result?.parameters).toEqual({
      attributes: {
        action: 'create',
        created_at: '2026-08-18T12:00:00.000Z',
        created_by: args.user,
        owner: 'cases',
        payload: args.payload,
        type: 'workflow',
      },
      references: [{ id: 'case-1', name: 'associated-cases', type: 'cases' }],
    });
    expect(result?.eventDetails).toEqual({
      action: 'create',
      descriptiveAction: 'case_user_action_workflow',
      getMessage: expect.any(Function),
      savedObjectId: 'case-1',
      savedObjectType: 'cases',
    });
  });
});
