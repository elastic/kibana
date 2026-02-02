/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { transformUpdateByQueryResponse } from './transform_update_by_query_response';

describe('transformUpdateByQueryResponse', () => {
  const res = {
    total: 10,
    updated: 5,
    failures: [
      {
        id: 'failure-id',
        index: 'failure-index',
        status: 0,
        cause: { type: 'error_type', reason: 'error_reason' },
      },
    ],
  };

  it('should transform the bulk update by query response correctly', () => {
    expect(transformUpdateByQueryResponse(res)).toEqual({
      failures: [
        {
          id: 'failure-id',
          index: 'failure-index',
          code: 'error_type',
          message: 'error_reason',
        },
      ],
      total: 10,
      updated: 5,
    });
  });
});
