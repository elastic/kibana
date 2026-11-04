/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../attachment/v1';
import { UserActionTypes } from './action/v1';
import {
  CaseUserActionWithoutReferenceIdsRt,
  CaseUserActionWithoutReferenceIdsWriteRt,
  UserActionsRt,
} from './v1';
import { UserActionsSchema } from '../../domain_zod/user_action/v1';

describe('User actions', () => {
  describe('UserActionsRt', () => {
    const defaultRequest = [
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
    ];

    it('has expected attributes in request', () => {
      const query = UserActionsRt.decode(defaultRequest);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: [...defaultRequest],
      });
    });

    it('removes foo:bar attributes from request', () => {
      const query = UserActionsRt.decode([{ ...defaultRequest[0], foo: 'bar' }]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('removes foo:bar attributes from payload', () => {
      const query = UserActionsRt.decode([
        { ...defaultRequest[0], payload: { ...defaultRequest[0].payload, foo: 'bar' } },
      ]);

      expect(query).toStrictEqual({
        _tag: 'Right',
        right: defaultRequest,
      });
    });

    it('zod: has expected attributes in request', () => {
      const result = UserActionsSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('zod: strips unknown fields', () => {
      const result = UserActionsSchema.safeParse([{ ...defaultRequest[0], foo: 'bar' }]);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('accepts a source with an unknown type', () => {
      const withSource = [{ ...defaultRequest[0], source: { type: 'futuristic', id: 'x1' } }];

      expect(UserActionsRt.decode(withSource)).toStrictEqual({ _tag: 'Right', right: withSource });
    });

    it('zod: accepts a source with an unknown type', () => {
      const withSource = [{ ...defaultRequest[0], source: { type: 'futuristic', id: 'x1' } }];
      const result = UserActionsSchema.safeParse(withSource);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(withSource);
    });
  });

  describe('CaseUserActionWithoutReferenceIds codecs', () => {
    const userAction = {
      type: UserActionTypes.title,
      payload: { title: 'new title' },
      created_at: '2020-02-19T23:06:33.798Z',
      created_by: {
        full_name: 'Leslie Knope',
        username: 'lknope',
        email: 'leslie.knope@elastic.co',
      },
      owner: 'cases',
      action: 'update',
    };
    const knownSource = { ...userAction, source: { type: 'api', id: 'api' } };
    const unknownSource = { ...userAction, source: { type: 'futuristic', id: 'x1' } };

    it('read codec accepts a source with an unknown type', () => {
      expect(CaseUserActionWithoutReferenceIdsRt.decode(unknownSource)._tag).toBe('Right');
    });

    it('write codec accepts a source with a known type', () => {
      expect(CaseUserActionWithoutReferenceIdsWriteRt.decode(knownSource)._tag).toBe('Right');
    });

    it('write codec rejects a source with an unknown type', () => {
      expect(CaseUserActionWithoutReferenceIdsWriteRt.decode(unknownSource)._tag).toBe('Left');
    });
  });
});
