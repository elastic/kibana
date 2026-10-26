/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';

export const KBN_EVALS_VAULT_CONFIG_FIELD = 'config';
export const DEFAULT_VAULT_ADDR = 'https://secrets.elastic.co:8200';
export const CI_PROD_VAULT_ADDR = 'https://vault-ci-prod.elastic.dev';

export type KbnEvalsVaultType = 'ci-prod' | 'dev';

export const KBN_EVALS_VAULT_TYPES: ReadonlyArray<KbnEvalsVaultType> = ['ci-prod', 'dev'];

/** Secret holding the config shared by every suite; suites can add their own via `vaultSecret`. */
export const KBN_EVALS_GENERAL_VAULT_SECRET = 'golden';

const KBN_EVALS_VAULT_PATH_PREFIXES: Record<KbnEvalsVaultType, string> = {
  'ci-prod': 'kv/ci-shared/kbn-evals',
  dev: 'secret/kibana-issues/dev/kbn-evals',
};

const VAULT_SECRET_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

/** Vault path of a kbn-evals secret, the general config by default. */
export const getKbnEvalsVaultPath = (
  vault: KbnEvalsVaultType,
  secret: string = KBN_EVALS_GENERAL_VAULT_SECRET
): string => {
  if (!VAULT_SECRET_NAME_PATTERN.test(secret)) {
    throw new Error(
      `Invalid kbn-evals vault secret name "${secret}": use lowercase letters, digits, "-" and "_"`
    );
  }
  return `${KBN_EVALS_VAULT_PATH_PREFIXES[vault]}/${secret}`;
};

export const KBN_EVALS_VAULT_PATHS: Record<KbnEvalsVaultType, string> = {
  'ci-prod': getKbnEvalsVaultPath('ci-prod'),
  dev: getKbnEvalsVaultPath('dev'),
};

export const KBN_EVALS_VAULT_LOGIN_COMMANDS: Record<KbnEvalsVaultType, string> = {
  'ci-prod': `vault login -address=${CI_PROD_VAULT_ADDR} -method=github`,
  dev: `vault login -address=${DEFAULT_VAULT_ADDR} -method=oidc`,
};

export const getVaultAddr = (): string => process.env.VAULT_ADDR || DEFAULT_VAULT_ADDR;

/**
 * Address of the Vault backing `vault`. ci-prod ignores `VAULT_ADDR`, which shells commonly point
 * at the legacy Vault; override it with `KBN_EVALS_CI_PROD_VAULT_ADDR` instead.
 */
export const getKbnEvalsVaultAddr = (vault: KbnEvalsVaultType): string =>
  vault === 'ci-prod'
    ? process.env.KBN_EVALS_CI_PROD_VAULT_ADDR || CI_PROD_VAULT_ADDR
    : getVaultAddr();

export const safeExec = (command: string, args: string[]): string | null => {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      env: {
        ...process.env,
        VAULT_ADDR: getVaultAddr(),
      },
    }).trim();
  } catch {
    return null;
  }
};
