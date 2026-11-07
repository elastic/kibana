/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeRequestError } from './request_error';

describe('describeRequestError', () => {
  it("says the response's status, and what the server said", () => {
    const error = Object.assign(new Error('Gateway Timeout'), {
      body: { message: "Elasticsearch didn't respond in time." },
      response: { status: 504, statusText: 'Gateway Timeout' },
    });

    expect(describeRequestError(error)).toEqual({
      status: '504 Gateway Timeout',
      message: "Elasticsearch didn't respond in time.",
    });
  });

  it("says the request's own message without a response, such as offline", () => {
    expect(describeRequestError(new Error('Failed to fetch'))).toEqual({
      status: undefined,
      message: 'Failed to fetch',
    });
  });
});
