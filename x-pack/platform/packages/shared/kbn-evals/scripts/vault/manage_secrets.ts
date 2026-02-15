/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import Path from 'path';
import Fs from 'fs';
import { writeFile, readFile } from 'fs/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import { schema } from '@kbn/config-schema';

/**
 * Vault-backed config used by @kbn/evals CI.
 *
 * This is intentionally minimal: we store only the LiteLLM key + base URL,
 * and credentials for the centralized Elasticsearch cluster where eval results
 * are exported.
 */

export const KBN_EVALS_VAULT_ENV_VAR = 'KIBANA_EVALS_CI_CONFIG';

type VaultType = 'ci-prod';

const VAULT_PATHS: Record<VaultType, string> = {
  'ci-prod': 'secret/ci/elastic-kibana/kbn-evals',
};

const getVaultPath = (vault: VaultType = 'ci-prod') => VAULT_PATHS[vault];

const KBN_EVALS_CONFIG_FIELD = 'config';

const KBN_EVALS_CONFIG_FILE = Path.join(
  REPO_ROOT,
  'x-pack/platform/packages/shared/kbn-evals',
  'scripts',
  'vault',
  'config.json'
);

const KBN_EVALS_CONFIG_EXAMPLE_FILE = Path.join(
  REPO_ROOT,
  'x-pack/platform/packages/shared/kbn-evals',
  'scripts',
  'vault',
  'config.example.json'
);

const configSchema = schema.object(
  {
    description: schema.maybe(schema.string()),
    contact: schema.maybe(schema.string()),
    owner: schema.maybe(schema.string()),
    environment: schema.maybe(schema.string()),
    creation_date: schema.maybe(schema.string()),
    refresh_interval: schema.maybe(schema.string()),

    litellm: schema.object(
      {
        baseUrl: schema.string({ minLength: 1 }),
        /**
         * LiteLLM *virtual key* (sk-...) used to call the proxy (and to query team metadata).
         * This should not be the proxy master key.
         */
        virtualKey: schema.string({ minLength: 1 }),
        /**
         * Optional team id used by CI to discover models for connector generation.
         * If omitted, CI may use a baked-in default.
         */
        teamId: schema.maybe(schema.string({ minLength: 1 })),
        /**
         * Optional, human-readable team name (not used for auth).
         */
        teamName: schema.maybe(schema.string({ minLength: 1 })),
      },
      { unknowns: 'allow' }
    ),

    /**
     * Connector used for LLM-as-a-judge evaluators. Must match a connector ID present
     * in the generated `KIBANA_TESTING_AI_CONNECTORS` payload.
     */
    evaluationConnectorId: schema.string({ minLength: 1 }),

    evaluationsEs: schema.object(
      {
        url: schema.string({ minLength: 1 }),
        apiKey: schema.string({ minLength: 1 }),
      },
      { unknowns: 'allow' }
    ),

    tracingEs: schema.maybe(
      schema.object(
        {
          url: schema.string({ minLength: 1 }),
          apiKey: schema.string({ minLength: 1 }),
        },
        { unknowns: 'allow' }
      )
    ),
  },
  { unknowns: 'allow' }
);

export type KbnEvalsCiConfig = ReturnType<typeof configSchema.validate>;

export const validateKbnEvalsCiConfig = (config: unknown): KbnEvalsCiConfig => {
  return configSchema.validate(config);
};

const ensureLocalConfigFileExists = (filePath: string) => {
  if (Fs.existsSync(filePath)) return;
  throw new Error(
    [
      `Missing local @kbn/evals vault config at: ${filePath}`,
      `Create it by copying the example:`,
      `  cp "${KBN_EVALS_CONFIG_EXAMPLE_FILE}" "${filePath}"`,
      `Then fill in real values locally (this file is gitignored).`,
    ].join('\n')
  );
};

export const retrieveFromVault = async (vaultPath: string, filePath: string, field: string) => {
  const { stdout } = await execa('vault', ['read', `-field=${field}`, vaultPath], {
    cwd: REPO_ROOT,
    buffer: true,
  });

  const value = Buffer.from(stdout, 'base64').toString('utf-8').trim();
  const parsed = JSON.parse(value);
  const validated = validateKbnEvalsCiConfig(parsed);
  await writeFile(filePath, JSON.stringify(validated, null, 2));
  // eslint-disable-next-line no-console
  console.log(`Config written to: ${filePath}`);
};

export const retrieveConfigFromVault = async (vault: VaultType = 'ci-prod') => {
  await retrieveFromVault(getVaultPath(vault), KBN_EVALS_CONFIG_FILE, KBN_EVALS_CONFIG_FIELD);
};

export const uploadToVault = async (vaultPath: string, filePath: string, field: string) => {
  ensureLocalConfigFileExists(filePath);
  const config = await readFile(filePath, 'utf-8');
  const validated = validateKbnEvalsCiConfig(JSON.parse(config));
  const asB64 = Buffer.from(JSON.stringify(validated)).toString('base64');

  await execa('vault', ['write', vaultPath, `${field}=${asB64}`], {
    cwd: REPO_ROOT,
    buffer: true,
  });
};

export const uploadConfigToVault = async (vault: VaultType = 'ci-prod') => {
  await uploadToVault(getVaultPath(vault), KBN_EVALS_CONFIG_FILE, KBN_EVALS_CONFIG_FIELD);
};

export const getCommand = async (
  format: 'vault-write' | 'env-var' = 'vault-write',
  vault: VaultType = 'ci-prod'
) => {
  ensureLocalConfigFileExists(KBN_EVALS_CONFIG_FILE);
  const config = await readFile(KBN_EVALS_CONFIG_FILE, 'utf-8');
  const validated = validateKbnEvalsCiConfig(JSON.parse(config));
  const asB64 = Buffer.from(JSON.stringify(validated)).toString('base64');

  if (format === 'vault-write') {
    return `vault write ${getVaultPath(vault)} ${KBN_EVALS_CONFIG_FIELD}=${asB64}`;
  }

  return `${KBN_EVALS_VAULT_ENV_VAR}=${asB64}`;
};

export const getKbnEvalsConfigFromEnvVar = (): KbnEvalsCiConfig => {
  const configValue = process.env[KBN_EVALS_VAULT_ENV_VAR];
  if (!configValue) {
    throw new Error(`Environment variable ${KBN_EVALS_VAULT_ENV_VAR} does not exist!`);
  }

  let config: unknown;
  try {
    config = JSON.parse(Buffer.from(configValue, 'base64').toString('utf-8'));
  } catch (e) {
    throw new Error(
      `Error trying to parse value from ${KBN_EVALS_VAULT_ENV_VAR} environment variable: ${
        (e as Error).message
      }`
    );
  }

  return validateKbnEvalsCiConfig(config);
};
