/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../../domain/attachment/v1';
import { UserActionTypes } from '../../domain/user_action/action/v1';
import {
  MAX_USER_ACTION_AUTHOR_LENGTH,
  MAX_USER_ACTION_AUTHORS_FILTER_LENGTH,
  MAX_USER_ACTION_SEARCH_LENGTH,
} from '../../../constants';
import { parseErrors } from '../../../test_helpers/zod_schema_test_utils';
import {
  type CaseUserActionStatsResponse,
  CaseUserActionStatsSchema,
  UserActionFindRequestSchema,
  UserActionInternalFindRequestSchema,
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

      it('strips search and author params (internal-only)', () => {
        const result = UserActionFindRequestSchema.safeParse({
          ...defaultRequest,
          search: 'test',
          author: 'elastic',
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({ ...defaultRequest, page: 1, perPage: 10 });
      });
    });

    describe('UserActionInternalFindRequestSchema', () => {
      const defaultRequest = {
        types: [UserActionTypes.comment],
        sortOrder: 'desc',
        page: '1',
        perPage: '10',
      };
      const parsedDefaults = { ...defaultRequest, page: 1, perPage: 10 };

      it('has expected attributes in request', () => {
        const result = UserActionInternalFindRequestSchema.safeParse({
          ...defaultRequest,
          search: 'test',
          authors: ['elastic'],
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({
          ...parsedDefaults,
          search: 'test',
          authors: ['elastic'],
        });
      });

      it('accepts multiple authors', () => {
        const result = UserActionInternalFindRequestSchema.safeParse({
          ...defaultRequest,
          authors: ['elastic', 'other'],
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({ ...parsedDefaults, authors: ['elastic', 'other'] });
      });

      it('accepts sources including none', () => {
        const result = UserActionInternalFindRequestSchema.safeParse({
          ...defaultRequest,
          sources: ['agent', 'none'],
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual({ ...parsedDefaults, sources: ['agent', 'none'] });
      });

      it('strips unknown fields', () => {
        const result = UserActionInternalFindRequestSchema.safeParse({
          ...defaultRequest,
          foo: 'bar',
        });
        expect(result.success).toBe(true);
        expect(result.data).toStrictEqual(parsedDefaults);
      });

      it(`throws an error when the search is more than ${MAX_USER_ACTION_SEARCH_LENGTH} characters`, () => {
        const search = 'a'.repeat(MAX_USER_ACTION_SEARCH_LENGTH + 1);

        expect(
          parseErrors(UserActionInternalFindRequestSchema, { ...defaultRequest, search })
        ).toContain(
          `The length of the search is too long. The maximum length is ${MAX_USER_ACTION_SEARCH_LENGTH}.`
        );
      });

      it('throws an error when the search is an empty string', () => {
        expect(
          parseErrors(UserActionInternalFindRequestSchema, { ...defaultRequest, search: '' })
        ).toContain('The search field cannot be an empty string.');
      });

      it(`throws an error when an author is more than ${MAX_USER_ACTION_AUTHOR_LENGTH} characters`, () => {
        const author = 'a'.repeat(MAX_USER_ACTION_AUTHOR_LENGTH + 1);

        expect(
          parseErrors(UserActionInternalFindRequestSchema, { ...defaultRequest, authors: [author] })
        ).toContain(
          `The length of the authors is too long. The maximum length is ${MAX_USER_ACTION_AUTHOR_LENGTH}.`
        );
      });

      it(`throws an error when the authors array has more than ${MAX_USER_ACTION_AUTHORS_FILTER_LENGTH} items`, () => {
        const authors = Array(MAX_USER_ACTION_AUTHORS_FILTER_LENGTH + 1).fill('elastic');

        expect(
          parseErrors(UserActionInternalFindRequestSchema, { ...defaultRequest, authors })
        ).toContain(
          `The length of the field authors is too long. Array must be of length <= ${MAX_USER_ACTION_AUTHORS_FILTER_LENGTH}.`
        );
      });

      it(`accepts exactly ${MAX_USER_ACTION_AUTHORS_FILTER_LENGTH} authors`, () => {
        const authors = Array(MAX_USER_ACTION_AUTHORS_FILTER_LENGTH).fill('elastic');

        expect(
          UserActionInternalFindRequestSchema.safeParse({ ...defaultRequest, authors }).success
        ).toBe(true);
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
