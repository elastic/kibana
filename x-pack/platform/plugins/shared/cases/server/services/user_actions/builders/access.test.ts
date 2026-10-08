/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseAccessMode } from '../../../../common/types/domain';
import type { UserActionParameters } from '../types';
import { AccessUserActionBuilder } from './access';

describe('AccessUserActionBuilder', () => {
  const builderArgs: UserActionParameters<'access'> = {
    action: 'update' as const,
    caseId: 'test-id',
    user: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic User',
      username: 'elastic',
    },
    owner: 'cases',
    payload: {
      access: { mode: CaseAccessMode.RESTRICTED },
    },
  };

  let builder: AccessUserActionBuilder;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    builder = new AccessUserActionBuilder();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('builds the action correctly', () => {
    const res = builder.build(builderArgs);

    expect(res).toMatchInlineSnapshot(`
      Object {
        "eventDetails": Object {
          "action": "update",
          "descriptiveAction": "case_user_action_update_case_access",
          "getMessage": [Function],
          "savedObjectId": "test-id",
          "savedObjectType": "cases",
        },
        "parameters": Object {
          "attributes": Object {
            "action": "update",
            "created_at": "2022-01-09T22:00:00.000Z",
            "created_by": Object {
              "email": "elastic@elastic.co",
              "full_name": "Elastic User",
              "username": "elastic",
            },
            "owner": "cases",
            "payload": Object {
              "access": Object {
                "mode": "restricted",
              },
            },
            "type": "access",
          },
          "references": Array [
            Object {
              "id": "test-id",
              "name": "associated-cases",
              "type": "cases",
            },
          ],
        },
      }
    `);
  });

  it('generates the correct log message', () => {
    const res = builder.build(builderArgs);

    expect(res.eventDetails.getMessage('ua-id')).toBe(
      'User updated the access mode for case id: test-id - user action id: ua-id'
    );
  });
});
