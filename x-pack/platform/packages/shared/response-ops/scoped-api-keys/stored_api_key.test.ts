/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUiamApiKeyId, getUiamApiKeySecret } from './stored_api_key';

describe('stored_api_key', () => {
  describe('getUiamApiKeySecret', () => {
    test('returns a raw UIAM credential as-is (grant path format)', () => {
      expect(getUiamApiKeySecret('essu_raw_secret')).toBe('essu_raw_secret');
    });

    test('extracts the secret from the `base64(id:secret)` format (UIAM provisioning path)', () => {
      const stored = Buffer.from('key-id:essu_converted_secret').toString('base64');

      expect(getUiamApiKeySecret(stored)).toBe('essu_converted_secret');
    });

    test('returns the stored value untouched when it decodes to a non-UIAM credential', () => {
      const stored = Buffer.from('key-id:not-a-uiam-secret').toString('base64');

      expect(getUiamApiKeySecret(stored)).toBe(stored);
    });

    test('returns the stored value untouched when it is neither raw nor base64 encoded', () => {
      expect(getUiamApiKeySecret('!!!not-base64!!!')).toBe('!!!not-base64!!!');
    });
  });

  describe('getUiamApiKeyId', () => {
    test('extracts the id from the `base64(id:secret)` format', () => {
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
});
