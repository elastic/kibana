/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../domain/attachment/v1';
import { UserActionTypes } from '../../domain/user_action/action/v1';
import {
  type CaseUserActionStatsResponse,
  CaseUserActionStatsSchema,
  UserActionFindRequestSchema,
  UserActionFindResponseSchema,
} from './v1';

describe('User actions APIs', () => {
  describe('Find API', () => {
    describe('UserActionFindRequestSchema', () => {
      const defaultRequest = {
        types: [UserActionTypes.comment],
        sortOrder: 'desc',
        page: '1',
        perPage: '10',
      };

      it('has expected attributes in request', () => {
        const result = UserActionFindRequestSchema.safeParse(defaultRequest);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({ ...defaultRequest, page: 1, perPage: 10 });
      });

      it('strips unknown fields', () => {
        const result = UserActionFindRequestSchema.safeParse({ ...defaultRequest, foo: 'bar' });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({ ...defaultRequest, page: 1, perPage: 10 });
      });
    });

    describe('UserActionFindResponseSchema', () => {
      const defaultRequest = {
        userActions: [
          {
            type: UserActionTypes.comment,
            payload: {
              comment: {
                comment: 'this is a sample comment',
                type: AttachmentType.user,
                owner: 'cases',
              },
            },
            created_at: '2020-02-19T23:06:33.798Z',
            created_by: {
              full_name: 'Leslie Knope',
              username: 'lknope',
              email: 'leslie.knope@elastic.co',
            },
            owner: 'cases',
            action: 'create',
            id: 'basic-comment-id',
            version: 'WzQ3LDFc',
            comment_id: 'basic-comment-id',
          },
        ],
        page: 1,
        perPage: 10,
        total: 20,
      };

      it('has expected attributes in request', () => {
        const result = UserActionFindResponseSchema.safeParse(defaultRequest);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(defaultRequest);
      });

      it('strips unknown fields', () => {
        const result = UserActionFindResponseSchema.safeParse({ ...defaultRequest, foo: 'bar' });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(defaultRequest);
      });
    });
  });

  describe('User actions stats API', () => {
    describe('CaseUserActionStatsSchema', () => {
      const defaultRequest: CaseUserActionStatsResponse = {
        total: 100,
        total_deletions: 0,
        total_comments: 60,
        total_comment_deletions: 0,
        total_comment_creations: 0,
        total_hidden_comment_updates: 0,
        total_other_actions: 40,
        total_other_action_deletions: 0,
      };

      it('has expected attributes in request', () => {
        const result = CaseUserActionStatsSchema.safeParse(defaultRequest);
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(defaultRequest);
      });

      it('strips unknown fields', () => {
        const result = CaseUserActionStatsSchema.safeParse({ ...defaultRequest, foo: 'bar' });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(defaultRequest);
      });
    });
  });
});
