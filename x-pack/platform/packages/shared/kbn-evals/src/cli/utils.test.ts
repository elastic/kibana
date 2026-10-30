/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CI_PROD_VAULT_ADDR,
  KBN_EVALS_VAULT_PATHS,
  getKbnEvalsVaultAddr,
  getKbnEvalsVaultPath,
} from './utils';

describe('getKbnEvalsVaultPath', () => {
  it('resolves the general config by default', () => {
    expect(getKbnEvalsVaultPath('ci-prod')).toBe('kv/ci-shared/kbn-evals/golden');
    expect(getKbnEvalsVaultPath('dev')).toBe('secret/kibana-issues/dev/kbn-evals/golden');
    expect(KBN_EVALS_VAULT_PATHS).toEqual({
      'ci-prod': 'kv/ci-shared/kbn-evals/golden',
      dev: 'secret/kibana-issues/dev/kbn-evals/golden',
    });
  });

  it('resolves a suite secret next to the general config in each vault', () => {
    expect(getKbnEvalsVaultPath('ci-prod', 'nightshift')).toBe('kv/ci-shared/kbn-evals/nightshift');
    expect(getKbnEvalsVaultPath('dev', 'nightshift')).toBe(
      'secret/kibana-issues/dev/kbn-evals/nightshift'
    );
  });

  it.each(['', '../golden', 'night/shift', 'Nightshift', '-nightshift'])(
    'rejects the secret name %p',
    (secret) => {
      expect(() => getKbnEvalsVaultPath('ci-prod', secret)).toThrow(
        'Invalid kbn-evals vault secret name'
      );
    }
  );
});

describe('getKbnEvalsVaultAddr', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.KBN_EVALS_CI_PROD_VAULT_ADDR;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the ci-prod Vault for ci-prod even when VAULT_ADDR points at the legacy Vault', () => {
    process.env.VAULT_ADDR = 'https://secrets.elastic.co';

    expect(getKbnEvalsVaultAddr('ci-prod')).toBe(CI_PROD_VAULT_ADDR);
    expect(getKbnEvalsVaultAddr('dev')).toBe('https://secrets.elastic.co');
  });

  it('lets KBN_EVALS_CI_PROD_VAULT_ADDR override the ci-prod address', () => {
    process.env.KBN_EVALS_CI_PROD_VAULT_ADDR = 'https://vault.example';

    expect(getKbnEvalsVaultAddr('ci-prod')).toBe('https://vault.example');
  });

  it('defaults dev to the legacy Vault', () => {
    delete process.env.VAULT_ADDR;

    expect(getKbnEvalsVaultAddr('dev')).toBe('https://secrets.elastic.co:8200');
  });
});
