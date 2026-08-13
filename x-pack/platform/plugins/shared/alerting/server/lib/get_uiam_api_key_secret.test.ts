/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUiamApiKeySecret } from './get_uiam_api_key_secret';

describe('getUiamApiKeySecret', () => {
  test('decodes a framework-granted UIAM key stored as base64(id:key)', () => {
    expect(getUiamApiKeySecret(Buffer.from('key-id:essu_granted_key').toString('base64'))).toEqual(
      'essu_granted_key'
    );
  });

  test('returns a raw user-created UIAM key as-is', () => {
    expect(getUiamApiKeySecret('essu_user_created_key')).toEqual('essu_user_created_key');
  });
});
