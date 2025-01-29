/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stripUnsafeHeaders } from './strip_unsafe_headers';

describe('stripUnsafeHeaders', () => {
  it.each`
    header                   | value
    ${'accept-encoding'}     | ${''}
    ${'connection'}          | ${'upgrade'}
    ${'content-length'}      | ${''}
    ${'content-type'}        | ${''}
    ${'host'}                | ${''}
    ${'transfer-encoding'}   | ${''}
    ${'proxy-connection'}    | ${'bananas'}
    ${'proxy-authorization'} | ${'some-base64-encoded-thing'}
    ${'trailer'}             | ${'s are for trucks'}
  `('should strip unsafe header "$header"', ({ header, value }) => {
    const headers = { [header]: value };

    expect(stripUnsafeHeaders(headers)).toEqual({});
  });

  it.each`
    header   | value
    ${'foo'} | ${'bar'}
    ${'baz'} | ${'quix'}
  `('should keep safe header "$header"', ({ header, value }) => {
    const headers = { [header]: value };

    expect(stripUnsafeHeaders(headers)).toEqual(headers);
  });
});
