/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { UserActionsSchema } from '../v1';
import { BulkAttachmentsUserActionSchema } from './v1';

describe('BulkAttachmentsUserActionSchema', () => {
  const userAction = {
    type: UserActionTypes.bulkAttachments,
    payload: { bulkAttachments: { attachmentType: 'security.alert', count: 3 } },
  };

  it('accepts a bulkAttachments user action', () => {
    expect(BulkAttachmentsUserActionSchema.parse(userAction)).toEqual(userAction);
  });

  it('strips unknown fields in bulkAttachments', () => {
    expect(
      BulkAttachmentsUserActionSchema.parse({
        ...userAction,
        payload: {
          bulkAttachments: { ...userAction.payload.bulkAttachments, ids: ['attachment-1'] },
        },
      })
    ).toEqual(userAction);
  });

  it('is part of UserActionsSchema', () => {
    const fullUserAction = {
      ...userAction,
      created_at: '2026-10-16T12:00:00.000Z',
      created_by: { full_name: null, username: 'lknope', email: null },
      owner: 'securitySolution',
      action: 'delete',
      comment_id: null,
      id: 'bulk-attachments-id',
      version: 'WzQ3LDFc',
    };

    const result = UserActionsSchema.safeParse([fullUserAction]);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual([fullUserAction]);
  });
});
