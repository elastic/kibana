/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionTypes } from '../action/v1';
import { UserActionsRt } from '../v1';
import { BulkAttachmentsUserActionPayloadRt, BulkAttachmentsUserActionRt } from './v1';

describe('Bulk attachments', () => {
  const payload = {
    bulkAttachments: {
      attachmentType: 'security.alert',
      count: 3,
    },
  };

  describe('BulkAttachmentsUserActionPayloadRt', () => {
    it('has expected attributes in request', () => {
      expect(BulkAttachmentsUserActionPayloadRt.decode(payload)).toStrictEqual({
        _tag: 'Right',
        right: payload,
      });
    });

    it('removes foo:bar attributes from bulkAttachments', () => {
      const query = BulkAttachmentsUserActionPayloadRt.decode({
        bulkAttachments: { ...payload.bulkAttachments, foo: 'bar' },
      });

      expect(query).toStrictEqual({ _tag: 'Right', right: payload });
    });
  });

  describe('BulkAttachmentsUserActionRt', () => {
    const userAction = { type: UserActionTypes.bulkAttachments, payload };

    it('has expected attributes in request', () => {
      expect(BulkAttachmentsUserActionRt.decode(userAction)).toStrictEqual({
        _tag: 'Right',
        right: userAction,
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = BulkAttachmentsUserActionRt.decode({ ...userAction, foo: 'bar' });

      expect(query).toStrictEqual({ _tag: 'Right', right: userAction });
    });
  });

  describe('UserActionsRt', () => {
    const userAction = {
      type: UserActionTypes.bulkAttachments,
      payload,
      created_at: '2026-10-16T12:00:00.000Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      owner: 'securitySolution',
      action: 'delete',
      comment_id: null,
      id: 'bulk-attachments-id',
      version: 'WzQ3LDFc',
    };

    it('decodes a bulkAttachments user action', () => {
      expect(UserActionsRt.decode([userAction])).toStrictEqual({
        _tag: 'Right',
        right: [userAction],
      });
    });

    it('strips unknown fields in bulkAttachments without failing', () => {
      const query = UserActionsRt.decode([
        {
          ...userAction,
          payload: { bulkAttachments: { ...payload.bulkAttachments, ids: ['attachment-1'] } },
        },
      ]);

      expect(query).toStrictEqual({ _tag: 'Right', right: [userAction] });
    });
  });
});
