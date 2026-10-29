/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserActionParameters } from '../types';
import { BulkAttachmentsUserActionBuilder } from './bulk_attachments';

describe('BulkAttachmentsUserActionBuilder', () => {
  const args: UserActionParameters<'bulkAttachments'> = {
    caseId: 'test-id',
    user: {
      email: 'elastic@elastic.co',
      full_name: 'Elastic User',
      username: 'elastic',
    },
    owner: 'securitySolution',
    payload: { bulkAttachments: { attachmentType: 'security.alert', count: 3 } },
  };

  let builder: BulkAttachmentsUserActionBuilder;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-01-09T22:00:00.000Z'));
  });

  beforeEach(() => {
    builder = new BulkAttachmentsUserActionBuilder();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('builds the action correctly', () => {
    const res = builder.build(args);

    expect(res).toMatchInlineSnapshot(`
      Object {
        "eventDetails": Object {
          "action": "delete",
          "descriptiveAction": "case_user_action_delete_attachments",
          "getMessage": [Function],
          "savedObjectId": "test-id",
          "savedObjectType": "cases",
        },
        "parameters": Object {
          "attributes": Object {
            "action": "delete",
            "created_at": "2022-01-09T22:00:00.000Z",
            "created_by": Object {
              "email": "elastic@elastic.co",
              "full_name": "Elastic User",
              "username": "elastic",
            },
            "owner": "securitySolution",
            "payload": Object {
              "bulkAttachments": Object {
                "attachmentType": "security.alert",
                "count": 3,
              },
            },
            "type": "bulkAttachments",
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
    const res = builder.build(args);

    expect(res.eventDetails.getMessage('ua-id')).toBe(
      'User deleted 3 security.alert items from case id: test-id - user action id: ua-id'
    );
  });

  it('uses the singular in the log message for a single item', () => {
    const res = builder.build({
      ...args,
      payload: { bulkAttachments: { attachmentType: 'file', count: 1 } },
    });

    expect(res.eventDetails.getMessage('ua-id')).toBe(
      'User deleted 1 file item from case id: test-id - user action id: ua-id'
    );
  });
});
