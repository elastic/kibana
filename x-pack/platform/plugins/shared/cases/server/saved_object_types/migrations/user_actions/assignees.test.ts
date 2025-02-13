/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../../../../common/types/domain';
import { CASE_USER_ACTION_SAVED_OBJECT } from '../../../../common/constants';
import { addAssigneesToCreateUserAction } from './assignees';

describe('assignees migration', () => {
  const userAction = {
    type: CASE_USER_ACTION_SAVED_OBJECT,
    id: '1',
    attributes: {
      action_at: '2022-01-09T22:00:00.000Z',
      action_by: {
        email: 'elastic@elastic.co',
        full_name: 'Elastic User',
        username: 'elastic',
      },
      payload: {},
      type: UserActionTypes.create_case,
    },
  };

  it('adds the assignees field to the create_case user action', () => {
    // @ts-expect-error payload does not include the required fields
    const migratedUserAction = addAssigneesToCreateUserAction(userAction);
    expect(migratedUserAction).toEqual({
      attributes: {
        action_at: '2022-01-09T22:00:00.000Z',
        action_by: {
          email: 'elastic@elastic.co',
          full_name: 'Elastic User',
          username: 'elastic',
        },
        payload: {
          assignees: [],
        },
        type: 'create_case',
      },
      id: '1',
      references: [],
      type: 'cases-user-actions',
    });
  });

  it('does NOT add the assignees field non-create_case user actions', () => {
    Object.keys(UserActionTypes)
      .filter((type) => type !== UserActionTypes.create_case)
      .forEach((type) => {
        const migratedUserAction = addAssigneesToCreateUserAction({
          ...userAction,
          // @ts-expect-error override the type, it is only expecting create_case
          attributes: { ...userAction.attributes, type },
        });

        expect(migratedUserAction).toEqual({
          attributes: {
            action_at: '2022-01-09T22:00:00.000Z',
            action_by: {
              email: 'elastic@elastic.co',
              full_name: 'Elastic User',
              username: 'elastic',
            },
            payload: {},
            type,
          },
          id: '1',
          references: [],
          type: 'cases-user-actions',
        });
      });
  });
});
