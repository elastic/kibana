/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUiamApiKeyId } from './uiam_api_key_id';

describe('getUiamApiKeyId', () => {
  test('extracts the id from a framework-granted key', () => {
    expect(getUiamApiKeyId(Buffer.from('key-id:essu_secret').toString('base64'))).toBe('key-id');
  });

  test('returns undefined for a raw user-created Cloud key, which has no id', () => {
    expect(getUiamApiKeyId('essu_user_created_key')).toBeUndefined();
  });

  test('returns undefined when the decoded secret is not a UIAM credential', () => {
    expect(
      getUiamApiKeyId(Buffer.from('key-id:not-a-uiam-secret').toString('base64'))
    ).toBeUndefined();
  });

  test('returns undefined for a missing key', () => {
    expect(getUiamApiKeyId()).toBeUndefined();
    expect(getUiamApiKeyId(null)).toBeUndefined();
    expect(getUiamApiKeyId('')).toBeUndefined();
  });
});
