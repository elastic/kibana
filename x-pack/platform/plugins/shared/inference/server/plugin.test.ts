/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getValidatedReplacementsEncryptionKey, resolveReplacementsEncryptionKey } from './plugin';

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

describe('resolveReplacementsEncryptionKey', () => {
  it('returns configured fallback key when anonymization is disabled', async () => {
    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: false,
        configuredEncryptionKey: 'fallback-key',
      })
    ).resolves.toBe('fallback-key');
  });

  it('returns policy-managed key when anonymization is enabled', async () => {
    const getReplacementsEncryptionKey = jest.fn().mockResolvedValue('managed-key');

    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: true,
        policyService: { getReplacementsEncryptionKey },
        configuredEncryptionKey: 'fallback-key',
      })
    ).resolves.toBe('managed-key');
  });

  it('falls back to configured key when policy service is unavailable', async () => {
    await expect(
      resolveReplacementsEncryptionKey({
        namespace: 'default',
        anonymizationEnabled: true,
        configuredEncryptionKey: 'fallback-key',
      })
    ).resolves.toBe('fallback-key');
  });
});
