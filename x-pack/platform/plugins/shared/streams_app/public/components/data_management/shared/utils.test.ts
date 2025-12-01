/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRequestPreviewCodeContent } from './utils';

describe('buildRequestPreviewCodeContent()', () => {
  it('returns only method and url when body is not provided', () => {
    expect(
      buildRequestPreviewCodeContent({
        method: 'POST',
        url: '/streams/_simulate',
      })
    ).toBe('POST /streams/_simulate');

    expect(
      buildRequestPreviewCodeContent({
        method: 'GET',
        url: '/streams',
        body: null,
      })
    ).toBe('GET /streams');
  });

  it('includes formatted body when provided', () => {
    const result = buildRequestPreviewCodeContent({
      method: 'PUT',
      url: '/streams/logs-foo',
      body: { processing: ['step1'] },
    });

    expect(result).toBe(`PUT /streams/logs-foo
{
  "processing": [
    "step1"
  ]
}`);
  });
});
