/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType } from '../attachment/v1';
import { UserActionTypes, UserActionsSchema } from './v1';

describe('User actions', () => {
  describe('UserActionsSchema', () => {
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
      const result = UserActionsSchema.safeParse(defaultRequest);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });

    it('strips unknown fields', () => {
      const result = UserActionsSchema.safeParse([{ ...defaultRequest[0], foo: 'bar' }]);
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual(defaultRequest);
    });
  });
});
