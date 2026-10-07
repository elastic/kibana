/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalServiceResponseRt } from './v1';
import { ExternalServiceResponseSchema } from '../../api_zod/external_service/v1';

describe('ExternalServiceResponseRt', () => {
  const defaultRequest = {
    title: 'case_title',
    id: 'basic-case-id',
    pushedDate: '2020-02-19T23:06:33.798Z',
    url: 'https://atlassian.com',
    comments: [
      {
        commentId: 'basic-comment-id',
        pushedDate: '2020-02-19T23:06:33.798Z',
        externalCommentId: 'external-comment-id',
      },
    ],
  };

  it('has expected attributes in request', () => {
    const query = ExternalServiceResponseRt.decode(defaultRequest);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = ExternalServiceResponseRt.decode({ ...defaultRequest, foo: 'bar' });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('removes foo:bar attributes from comments', () => {
    const query = ExternalServiceResponseRt.decode({
      ...defaultRequest,
      comments: [{ ...defaultRequest.comments[0], foo: 'bar' }],
    });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('zod: has expected attributes in request', () => {
    const result = ExternalServiceResponseSchema.safeParse(defaultRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });

  it('zod: strips unknown fields', () => {
    const result = ExternalServiceResponseSchema.safeParse({ ...defaultRequest, foo: 'bar' });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });
});
