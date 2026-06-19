/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalServiceSchema } from './v1';

describe('ExternalServiceSchema', () => {
  const defaultRequest = {
    connector_id: 'servicenow-1',
    connector_name: 'My SN connector',
    external_id: 'external_id',
    external_title: 'external title',
    external_url: 'basicPush.com',
    pushed_at: '2023-01-17T09:46:29.813Z',
    pushed_by: {
      full_name: 'Leslie Knope',
      username: 'lknope',
      email: 'leslie.knope@elastic.co',
    },
  };

  it('has expected attributes in request', () => {
    const result = ExternalServiceSchema.safeParse(defaultRequest);
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });

  it('strips unknown fields', () => {
    const result = ExternalServiceSchema.safeParse({ ...defaultRequest, foo: 'bar' });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });

  it('strips unknown fields from pushed_by', () => {
    const result = ExternalServiceSchema.safeParse({
      ...defaultRequest,
      pushed_by: { ...defaultRequest.pushed_by, foo: 'bar' },
    });
    expect(result.success).toBe(true);
    expect(result.data).toStrictEqual(defaultRequest);
  });
});
