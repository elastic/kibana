/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomFieldTypes, UserActionActions } from '../../../../common/types/domain';
import { PersistableStateAttachmentTypeRegistry } from '../../../attachment_framework/persistable_state_registry';
import type { UserActionParameters } from '../types';
import { CustomFieldsUserActionBuilder } from './custom_fields';

describe('CustomFieldsUserActionBuilder', () => {
  const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();

  const builderArgs: UserActionParameters<'customFields'> = {
    action: 'update' as const,
    caseId: 'test-id',
    user: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic User',
      username: 'elastic',
    },
    owner: 'cases',
    payload: {
      customFields: [
        {
          key: 'string_custom_field_1',
          type: CustomFieldTypes.TEXT,
          value: 'this is a text field value',
        },
      ],
    },
  };

  let builder: CustomFieldsUserActionBuilder;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  beforeEach(() => {
    jest.resetAllMocks();

    builder = new CustomFieldsUserActionBuilder({ persistableStateAttachmentTypeRegistry });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('builds the action correctly', async () => {
    const res = builder.build(builderArgs);

    expect(res).toMatchInlineSnapshot(`
      Object {
        "eventDetails": Object {
          "action": "update",
          "descriptiveAction": "case_user_action_update_case_custom_fields",
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
              "customFields": Array [
                Object {
                  "key": "string_custom_field_1",
                  "type": "text",
                  "value": "this is a text field value",
                },
              ],
            },
            "type": "customFields",
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

  it.each([
    [UserActionActions.add, 'added', 'to'],
    [UserActionActions.update, 'changed', 'for'],
    [UserActionActions.delete, 'deleted', 'from'],
  ])('show the message correctly for action: %s', async (action, verb, preposition) => {
    const res = builder.build({ ...builderArgs, action });

    expect(res.eventDetails.getMessage('ua-id')).toBe(
      `User ${verb} keys: [string_custom_field_1] ${preposition} case id: test-id - user action id: ua-id`
    );
  });
});
