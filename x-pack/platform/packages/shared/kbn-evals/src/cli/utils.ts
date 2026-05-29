/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';

export const VAULT_SECRET_PATH = 'secret/kibana-issues/dev/inference/kibana-eis-ccm';
export const KBN_EVALS_VAULT_CONFIG_FIELD = 'config';
export const DEFAULT_VAULT_ADDR = 'https://secrets.elastic.co:8200';

export type KbnEvalsVaultType = 'ci-prod' | 'dev';

export const KBN_EVALS_VAULT_TYPES: ReadonlyArray<KbnEvalsVaultType> = ['ci-prod', 'dev'];

export const KBN_EVALS_VAULT_PATHS: Record<KbnEvalsVaultType, string> = {
  'ci-prod': 'secret/ci/elastic-kibana/kbn-evals',
  dev: 'secret/kibana-issues/dev/kbn-evals/golden',
};

export const getVaultAddr = (): string => process.env.VAULT_ADDR || DEFAULT_VAULT_ADDR;

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
