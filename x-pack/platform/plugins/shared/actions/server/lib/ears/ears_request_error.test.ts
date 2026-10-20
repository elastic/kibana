/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EarsRequestError, getEarsRequestId } from './ears_request_error';

describe('getEarsRequestId', () => {
  it('reads the x-cloud-request-id header', () => {
    expect(getEarsRequestId({ 'x-cloud-request-id': 'req-123' })).toBe('req-123');
  });

  it('uses the last value when the proxy appended its own to an existing one', () => {
    expect(getEarsRequestId({ 'x-cloud-request-id': 'client-supplied, proxy-assigned' })).toBe(
      'proxy-assigned'
    );
  });

  it.each([
    [undefined],
    [null],
    [{}],
    [{ 'x-cloud-request-id': '' }],
    [{ 'x-cloud-request-id': 5 }],
  ])('returns undefined when there is no usable header (%p)', (headers) => {
    expect(getEarsRequestId(headers)).toBeUndefined();
  });
});

describe('EarsRequestError', () => {
  it('carries the status and request id', () => {
    const error = new EarsRequestError({ message: 'boom', status: 502, earsRequestId: 'req-1' });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'EarsRequestError',
      message: 'boom',
      status: 502,
      earsRequestId: 'req-1',
    });
  });
});
