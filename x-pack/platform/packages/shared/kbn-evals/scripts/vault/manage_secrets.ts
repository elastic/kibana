/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';
import Path from 'path';
import Fs from 'fs';
import { chmod, writeFile, readFile } from 'fs/promises';
import { REPO_ROOT } from '@kbn/repo-info';
import { schema } from '@kbn/config-schema';
import {
  KBN_EVALS_VAULT_LOGIN_COMMANDS,
  KBN_EVALS_VAULT_PATHS,
  getKbnEvalsVaultAddr,
  getKbnEvalsVaultPath,
  type KbnEvalsVaultType,
} from '../../src/cli/utils';
import { resolveEvalSuites } from '../../src/cli/suites';
import { runScoutHook } from '../../src/cli/scout_hook';

/**
 * Vault-backed config used by @kbn/evals CI and local development.
 *
 * This is intentionally minimal: we store OpenRouter credentials, plus credentials for
 * the centralized Elasticsearch cluster where eval results are exported.
 */

export const KBN_EVALS_VAULT_ENV_VAR = 'KIBANA_EVALS_CI_CONFIG';

export const getVaultPath = (vault: KbnEvalsVaultType): string => KBN_EVALS_VAULT_PATHS[vault];

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

    openrouter: schema.object(
      {
        baseUrl: schema.string({ minLength: 1 }),
        /**
         * OpenRouter API key used for non-EIS models.
         */
        apiKey: schema.string({ minLength: 1 }),
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
    evaluationsKbn: schema.maybe(
      schema.object(
        {
          url: schema.string({ minLength: 1 }),
          apiKey: schema.string({ minLength: 1 }),
        },
        { unknowns: 'allow' }
      )
    ),
    gcsDatasetAccessCredentials: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  },
  { unknowns: 'allow' }
);

export type KbnEvalsConfig = ReturnType<typeof configSchema.validate>;

export const validateKbnEvalsConfig = (config: unknown): KbnEvalsConfig => {
  return configSchema.validate(config);
};

export type SuiteVaultConfig = Record<string, unknown>;

/** Suite secrets are owned by their suite's `scoutHook`, so only their root shape is checked here. */
export const validateSuiteVaultConfig = (config: unknown): SuiteVaultConfig => {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error('Suite vault config must be a JSON object');
  }
  return config as SuiteVaultConfig;
};

export interface VaultTarget {
  vault: KbnEvalsVaultType;
  vaultPath: string;
  /** Gitignored local copy that retrieve writes and upload reads. */
  filePath: string;
  exampleFilePath: string;
  validate: (config: unknown) => object;
  /** Runs before a config is sent to Vault, and throws if it would not work. */
  checkBeforeUpload?: (config: object) => void;
}

/**
 * Resolves where `vault` stores a config: the general config by default, or the secret named by
 * the suite's `vaultSecret` in `evals.suites.json`, kept locally under `<suite dir>/vault/`.
 */
export const resolveVaultTarget = (vault: KbnEvalsVaultType, suiteId?: string): VaultTarget => {
  if (suiteId === undefined) {
    return {
      vault,
      vaultPath: getVaultPath(vault),
      filePath: KBN_EVALS_CONFIG_FILE,
      exampleFilePath: KBN_EVALS_CONFIG_EXAMPLE_FILE,
      validate: validateKbnEvalsConfig,
    };
  }

  // A bare `--suite` parses as '' and must not fall back to the general secret.
  if (!suiteId.trim()) {
    throw new Error('--suite needs a suite id from evals.suites.json, e.g. --suite my-suite');
  }

  const suite = resolveEvalSuites(REPO_ROOT).find(({ id }) => id === suiteId);
  if (!suite) {
    throw new Error(`Unknown eval suite "${suiteId}" (see evals.suites.json)`);
  }
  const { vaultSecret, scoutHook, absoluteConfigPath } = suite;
  if (!vaultSecret) {
    throw new Error(`Eval suite "${suiteId}" has no vaultSecret in evals.suites.json`);
  }

  const suiteVaultDir = Path.join(Path.dirname(absoluteConfigPath), 'vault');
  return {
    vault,
    vaultPath: getKbnEvalsVaultPath(vault, vaultSecret),
    filePath: Path.join(suiteVaultDir, 'config.json'),
    exampleFilePath: Path.join(suiteVaultDir, 'config.example.json'),
    validate: validateSuiteVaultConfig,
    checkBeforeUpload: scoutHook
      ? (config) => {
          // Only PATH and HOME, so credentials exported in the uploader's shell can't stand in for
          // ones missing from the config.
          const { PATH, HOME } = process.env;
          const env = runScoutHook(REPO_ROOT, scoutHook, config, { env: { PATH, HOME } });
          if (Object.keys(env).length === 0) {
            throw new Error(
              `scoutHook ${scoutHook} produced no env for this config; CI would start Scout without this suite's env`
            );
          }
        }
      : undefined,
  };
};

export const describeVaultTarget = ({ vault, vaultPath, filePath }: VaultTarget): string =>
  `Using ${vault} vault (${getKbnEvalsVaultAddr(
    vault
  )}, ${vaultPath}) with local file ${Path.relative(REPO_ROOT, filePath)}...`;

const ensureLocalConfigFileExists = ({ filePath, exampleFilePath }: VaultTarget) => {
  if (Fs.existsSync(filePath)) return;
  throw new Error(
    [
      `Missing local @kbn/evals vault config at: ${filePath}`,
      `Create it by copying the example:`,
      `  cp "${exampleFilePath}" "${filePath}"`,
      `Then fill in real values locally (this file is gitignored).`,
    ].join('\n')
  );
};

const readLocalConfigForUpload = async (target: VaultTarget): Promise<string> => {
  ensureLocalConfigFileExists(target);
  const config = await readFile(target.filePath, 'utf-8');
  const validated = target.validate(JSON.parse(config));
  target.checkBeforeUpload?.(validated);
  return Buffer.from(JSON.stringify(validated)).toString('base64');
};

/**
 * Runs a `vault kv` subcommand against `vault`. `vault kv` handles both the KV v1 dev mount and the
 * KV v2 ci-prod mount. Failures are rethrown without the command line or stdin, which can hold the
 * config.
 */
const runVaultKv = async (
  vault: KbnEvalsVaultType,
  args: string[],
  input?: string
): Promise<string> => {
  const address = getKbnEvalsVaultAddr(vault);
  try {
    const { stdout } = await execa('vault', ['kv', ...args], {
      cwd: REPO_ROOT,
      buffer: true,
      input,
      env: {
        ...process.env,
        VAULT_ADDR: address,
      },
    });
    return stdout;
  } catch (error) {
    // `shortMessage` omits stdout/stderr, and the argv it quotes never holds the config.
    const { stderr, shortMessage } = error as { stderr?: string; shortMessage?: string };
    throw new Error(
      [
        `vault kv ${args[0]} against the ${vault} vault (${address}) failed:`,
        stderr?.trim() || shortMessage || (error as Error).name,
        `If your token is missing or expired, log in with: ${KBN_EVALS_VAULT_LOGIN_COMMANDS[vault]}`,
      ].join('\n')
    );
  }
};

export const retrieveConfigFromVault = async (
  target: VaultTarget,
  /** An earlier KV v2 version to read, e.g. to roll back a bad upload. */
  version?: number
) => {
  const { vault, vaultPath, filePath, validate } = target;
  const versionArgs = version === undefined ? [] : [`-version=${version}`];
  const stdout = await runVaultKv(vault, [
    'get',
    `-field=${KBN_EVALS_CONFIG_FIELD}`,
    ...versionArgs,
    vaultPath,
  ]);

  const value = Buffer.from(stdout, 'base64').toString('utf-8').trim();
  const validated = validate(JSON.parse(value));
  await Fs.promises.mkdir(Path.dirname(filePath), { recursive: true });
  // `mode` only applies when the file is created, so also tighten a copy that already exists.
  await writeFile(filePath, JSON.stringify(validated, null, 2), { mode: 0o600 });
  await chmod(filePath, 0o600);
  // eslint-disable-next-line no-console
  console.log(`Config written to: ${filePath}`);
};

export const uploadConfigToVault = async (target: VaultTarget) => {
  const asB64 = await readLocalConfigForUpload(target);
  // `<field>=-` reads the value from stdin, keeping the config out of the process arguments.
  await runVaultKv(target.vault, ['put', target.vaultPath, `${KBN_EVALS_CONFIG_FIELD}=-`], asB64);
};

export const getCommand = async (
  format: 'vault-write' | 'env-var' = 'vault-write',
  target: VaultTarget
) => {
  const asB64 = await readLocalConfigForUpload(target);

  if (format === 'vault-write') {
    return `vault kv put -address=${getKbnEvalsVaultAddr(target.vault)} ${
      target.vaultPath
    } ${KBN_EVALS_CONFIG_FIELD}=${asB64}`;
  }

  return `${KBN_EVALS_VAULT_ENV_VAR}=${asB64}`;
};

export const getKbnEvalsConfigFromEnvVar = (): KbnEvalsConfig => {
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

  return validateKbnEvalsConfig(config);
};
