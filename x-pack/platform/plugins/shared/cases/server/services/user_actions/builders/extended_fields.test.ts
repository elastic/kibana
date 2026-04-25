/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PersistableStateAttachmentTypeRegistry } from '../../../attachment_framework/persistable_state_registry';
import type { UserActionParameters } from '../types';
import { ExtendedFieldsUserActionBuilder } from './extended_fields';

describe('ExtendedFieldsUserActionBuilder', () => {
  const persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();

  const builderArgs: UserActionParameters<'extended_fields'> = {
    action: 'update' as const,
    caseId: 'test-id',
    user: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic User',
      username: 'elastic',
    },
    owner: 'cases',
    payload: {
      extended_fields: {
        risk_score: 'high',
        affected_systems: 'web-server',
      },
    },
  };

  let builder: ExtendedFieldsUserActionBuilder;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  beforeEach(() => {
    jest.resetAllMocks();
    builder = new ExtendedFieldsUserActionBuilder({ persistableStateAttachmentTypeRegistry });
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
          "descriptiveAction": "case_user_action_update_extended_fields",
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
              "extended_fields": Object {
                "affected_systems": "web-server",
                "risk_score": "high",
              },
            },
            "type": "extended_fields",
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
      'User updated template fields for case id: test-id - user action id: ua-id'
    );
  });

  it('generates the correct log message when id is undefined', () => {
    const res = builder.build(builderArgs);

    expect(res.eventDetails.getMessage()).toBe(
      'User updated template fields for case id: test-id - user action id: undefined'
    );
  });
});
