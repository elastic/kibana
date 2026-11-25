/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseMetadataFilter } from './metadata_filter';

describe('parseMetadataFilter', () => {
  it('reads a key, a key and value, and a key and value prefix', () => {
    expect(parseMetadataFilter(' triage ')).toEqual({ key: 'triage' });
    expect(parseMetadataFilter('triage: confirmed')).toEqual({ key: 'triage', value: 'confirmed' });
    expect(parseMetadataFilter('owner:pay*')).toEqual({ key: 'owner', prefix: 'pay' });
  });

  it('keeps the rest of the input as the value when it holds another colon', () => {
    expect(parseMetadataFilter('url:https://example.com')).toEqual({
      key: 'url',
      value: 'https://example.com',
    });
  });

  it('treats a bare key with a trailing colon or star as a presence filter', () => {
    expect(parseMetadataFilter('triage:')).toEqual({ key: 'triage' });
    expect(parseMetadataFilter('triage:*')).toEqual({ key: 'triage' });
  });

  it('rejects input without a key or with a star in the key', () => {
    expect(parseMetadataFilter('')).toBeUndefined();
    expect(parseMetadataFilter(':value')).toBeUndefined();
    expect(parseMetadataFilter('tri*:value')).toBeUndefined();
  });
});
