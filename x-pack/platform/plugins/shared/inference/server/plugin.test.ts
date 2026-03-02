/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValidatedReplacementsEncryptionKey } from './plugin';

describe('getValidatedReplacementsEncryptionKey', () => {
  it('returns undefined when anonymization is disabled', () => {
    expect(
      getValidatedReplacementsEncryptionKey({
        anonymizationEnabled: false,
        encryptionKey: undefined,
      })
    ).toBeUndefined();
  });

  it('returns undefined when anonymization is enabled and key is missing', () => {
    expect(
      getValidatedReplacementsEncryptionKey({
        anonymizationEnabled: true,
        encryptionKey: undefined,
      })
    ).toBeUndefined();
  });

  it('returns key when anonymization is enabled and key is set', () => {
    expect(
      getValidatedReplacementsEncryptionKey({
        anonymizationEnabled: true,
        encryptionKey: 'test-key',
      })
    ).toBe('test-key');
  });
});
