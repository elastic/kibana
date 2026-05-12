/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execSync, spawnSync } from 'child_process';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import inquirer from 'inquirer';
import type { Command } from '@kbn/dev-cli-runner';
import { set } from '@kbn/safer-lodash-set';
import { parseConnectorsFromEnv, parseConnectorsFromKibanaDevYml } from '../prompts';
import { safeExec, VAULT_SECRET_PATH } from '../utils';
import { VAULT_CONFIG_DIR } from '../profiles';
import { buildApiKeyPayload } from '../../api_key/build_api_key_payload';

const EIS_MODELS_PATH = 'target/eis_models.json';

const CONFIG_FILENAME = 'config.json';
const CONFIG_EXAMPLE_FILENAME = 'config.example.json';

const GOLDEN_CLUSTER_KBN_URL =
  'https://kbn-evals-serverless-ed035a.kb.us-central1.gcp.elastic.cloud';
const GOLDEN_CLUSTER_DEV_TOOLS_URL = `${GOLDEN_CLUSTER_KBN_URL}/app/dev_tools#/console`;

const resolveUserIdentifier = (): string => {
  try {
    const email = execSync('git config user.email', { encoding: 'utf8' }).trim();
    if (email) return email;
  } catch {
    // fall through
  }
  return Os.hostname();
};

const API_KEY_FIELDS = [
  'evaluationsEs.apiKey',
  'tracingEs.apiKey',
  'evaluationsKbn.apiKey',
] as const;

const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  const arrayMatch = path.match(/^(.+)\[(\d+)\]\.(.+)$/);
  if (arrayMatch) {
    const [, arrayPath, indexStr, rest] = arrayMatch;
    const arr = getNestedValue(obj, arrayPath) as unknown[];
    if (!Array.isArray(arr)) return undefined;
    return getNestedValue(arr[Number(indexStr)] as Record<string, unknown>, rest);
  }
  return path.split('.').reduce<unknown>((cur, key) => {
    if (cur && typeof cur === 'object' && Object.hasOwn(cur as Record<string, unknown>, key)) {
      return (cur as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
};

const setNestedValue = (obj: Record<string, unknown>, path: string, value: unknown): void => {
  set(obj, path, value);
};

const openBrowser = (url: string): boolean => {
  try {
    if (process.platform === 'darwin') {
      execSync(`open ${JSON.stringify(url)}`, { stdio: 'ignore' });
    } else if (process.platform === 'linux') {
      execSync(`xdg-open ${JSON.stringify(url)}`, { stdio: 'ignore' });
    } else if (process.platform === 'win32') {
      execSync(`start "" ${JSON.stringify(url)}`, { stdio: 'ignore' });
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const copyToClipboard = (text: string): boolean => {
  try {
    if (process.platform === 'darwin') {
      execSync('pbcopy', { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
    } else if (process.platform === 'linux') {
      execSync('xclip -selection clipboard', {
        input: text,
        stdio: ['pipe', 'ignore', 'ignore'],
      });
    } else {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Walks the user through generating a unified API key via the golden
 * cluster Dev Tools, then fills all relevant config fields from it.
 * Returns the encoded key, or null if the user skipped.
 */
const runBrowserApiKeyFlow = async (
  config: Record<string, unknown>,
  log: { info: (msg: string) => void; warning: (msg: string) => void }
): Promise<string | null> => {
  const userIdentifier = resolveUserIdentifier();
  const payload = buildApiKeyPayload(userIdentifier);

  log.info('');
  log.info(`API key will be named "kbn-evals-${userIdentifier}"`);
  log.info('Opening the golden cluster Dev Tools in your browser...');
  log.info(`  ${GOLDEN_CLUSTER_DEV_TOOLS_URL}`);
  log.info('');

  const browserOpened = openBrowser(GOLDEN_CLUSTER_DEV_TOOLS_URL);
  if (!browserOpened) {
    log.warning('Could not open browser automatically. Open this URL manually:');
    log.info(`  ${GOLDEN_CLUSTER_DEV_TOOLS_URL}`);
  }

  const copied = copyToClipboard(payload);
  if (copied) {
    log.info('The API key creation request has been copied to your clipboard.');
    log.info('Paste it into the Dev Tools console and click the play button.');
  } else {
    log.info('Paste the following request into the Dev Tools console:');
    log.info('');
    log.info(payload);
  }

  log.info('');
  log.info('After running the request, copy the "encoded" value from the response.');
  log.info('');

  const { encodedKey } = await inquirer.prompt<{ encodedKey: string }>({
    type: 'input',
    name: 'encodedKey',
    message: 'Paste the "encoded" API key value here (or press Enter to skip):',
    default: '',
  });

  const trimmed = encodedKey.trim();
  if (!trimmed) {
    log.warning('No API key provided. You can fill in the keys manually in config.json.');
    return null;
  }

  for (const field of API_KEY_FIELDS) {
    setNestedValue(config, field, trimmed);
  }

  setNestedValue(config, 'tracingExporters[0].http.headers.Authorization', `ApiKey ${trimmed}`);

  log.info('API key applied to evaluationsEs, tracingEs, evaluationsKbn, and tracingExporters.');
  return trimmed;
};

/**
 * Reads the existing config and returns the API key if all four secret
 * fields are populated with matching non-placeholder values.
 */
const getExistingApiKey = (configPath: string): string | null => {
  try {
    const existing = JSON.parse(Fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    const evalKey = getNestedValue(existing, 'evaluationsEs.apiKey');
    if (typeof evalKey !== 'string' || !evalKey || evalKey.includes('REPLACE_ME')) {
      return null;
    }
    return evalKey;
  } catch {
    return null;
  }
};

const runConfigInit = async (
  repoRoot: string,
  log: { info: (msg: string) => void; warning: (msg: string) => void },
  options?: { profile?: string }
): Promise<boolean> => {
  const configDir = Path.resolve(repoRoot, VAULT_CONFIG_DIR);
  const configFileName = options?.profile ? `config.${options.profile}.json` : CONFIG_FILENAME;
  const configPath = Path.join(configDir, configFileName);
  const examplePath = Path.join(configDir, CONFIG_EXAMPLE_FILENAME);
  const userIdentifier = resolveUserIdentifier();

  let existingApiKey: string | null = null;

  if (Fs.existsSync(configPath)) {
    existingApiKey = getExistingApiKey(configPath);
    log.info(`Config already exists at ${VAULT_CONFIG_DIR}/${configFileName}`);
    const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>({
      type: 'confirm',
      name: 'overwrite',
      message: `Overwrite existing ${configFileName}?`,
      default: false,
    });
    if (!overwrite) {
      log.info('Keeping existing config.');
      return true;
    }
  }

  if (!Fs.existsSync(examplePath)) {
    log.warning(`Example config not found at ${examplePath}`);
    return false;
  }

  const example = JSON.parse(Fs.readFileSync(examplePath, 'utf-8')) as Record<string, unknown>;

  example.description = `kbn-evals local config for ${userIdentifier}`;
  example.contact = userIdentifier;
  example.owner = userIdentifier;

  const profile = options?.profile;
  const isLocalProfile = profile === 'local';
  if (isLocalProfile) {
    // Local profile is intended for exporting results/traces to a local ES/Kibana.
    setNestedValue(example, 'evaluationsEs.url', 'http://elastic:changeme@localhost:9200');
    setNestedValue(example, 'evaluationsEs.apiKey', '');
    setNestedValue(example, 'tracingEs.url', 'http://elastic:changeme@localhost:9200');
    setNestedValue(example, 'tracingEs.apiKey', '');
    example.tracingExporters = [{ http: { url: 'http://localhost:4318/v1/traces' } }];

    // This profile doesn't need golden-cluster dataset/GCS settings.
    delete example.evaluationsKbn;
    delete example.gcsDatasetAccessCredentials;

    // Avoid prompting for unrelated secrets in the local export profile.
    setNestedValue(example, 'litellm.virtualKey', '');
    setNestedValue(example, 'litellm.teamId', '');
    setNestedValue(example, 'evaluationConnectorId', '');
  }

  log.info('');
  log.info('The config has sensible URL defaults. You only need to fill in secret values.');
  log.info('');

  // --- Golden cluster API key ---
  if (isLocalProfile) {
    log.info('Skipping golden cluster API key setup for local profile.');
    log.info('');
  }
  let reusingKey = false;
  if (!isLocalProfile && existingApiKey) {
    const { reuseKey } = await inquirer.prompt<{ reuseKey: boolean }>({
      type: 'confirm',
      name: 'reuseKey',
      message: 'Existing API key found in previous config. Reuse it?',
      default: true,
    });
    if (reuseKey) {
      reusingKey = true;
      for (const field of API_KEY_FIELDS) {
        setNestedValue(example, field, existingApiKey);
      }
      setNestedValue(
        example,
        'tracingExporters[0].http.headers.Authorization',
        `ApiKey ${existingApiKey}`
      );
      log.info('Reusing existing API key for all golden cluster fields.');
    }
  }

  if (!isLocalProfile && !reusingKey) {
    const { useAutoKey } = await inquirer.prompt<{ useAutoKey: boolean }>({
      type: 'confirm',
      name: 'useAutoKey',
      message: 'Create a golden cluster API key automatically via Dev Tools? (opens browser)',
      default: true,
    });

    if (useAutoKey) {
      await runBrowserApiKeyFlow(example, log);
    } else {
      log.info('');
      log.info('Enter API keys manually. Press Enter to skip and fill in config.json later.');
      log.info('');

      const manualFields = [
        { jsonPath: 'evaluationsEs.apiKey', label: 'Evaluations ES API key' },
        { jsonPath: 'tracingEs.apiKey', label: 'Tracing ES API key (same cluster)' },
        {
          jsonPath: 'tracingExporters[0].http.headers.Authorization',
          label: 'Tracing exporter Authorization header (e.g. ApiKey ...)',
        },
        {
          jsonPath: 'evaluationsKbn.apiKey',
          label: 'Golden cluster Kibana API key (for datasets)',
        },
      ];
      for (const field of manualFields) {
        const currentValue = getNestedValue(example, field.jsonPath);
        if (typeof currentValue === 'string' && currentValue.includes('REPLACE_ME')) {
          const { value } = await inquirer.prompt<{ value: string }>({
            type: 'input',
            name: 'value',
            message: `${field.label}:`,
            default: '',
          });
          if (value.trim()) {
            setNestedValue(example, field.jsonPath, value.trim());
          }
        }
      }
    }
  }

  // --- LiteLLM ---
  const litellmVirtualKey = getNestedValue(example, 'litellm.virtualKey');
  if (typeof litellmVirtualKey === 'string' && litellmVirtualKey.includes('REPLACE_ME')) {
    const { value } = await inquirer.prompt<{ value: string }>({
      type: 'input',
      name: 'value',
      message: 'LiteLLM virtual key (sk-...):',
      default: '',
    });
    if (value.trim()) {
      setNestedValue(example, 'litellm.virtualKey', value.trim());
    }
  }

  const litellmTeamId = getNestedValue(example, 'litellm.teamId');
  if (typeof litellmTeamId === 'string' && litellmTeamId.includes('REPLACE_ME')) {
    const { value } = await inquirer.prompt<{ value: string }>({
      type: 'input',
      name: 'value',
      message: 'LiteLLM team ID (find yours at https://elastic.litellm-prod.ai/ui/?page=teams):',
      default: '',
    });
    if (value.trim()) {
      setNestedValue(example, 'litellm.teamId', value.trim());
    }
  }

  // --- GCS credentials ---
  if (!isLocalProfile) {
    const { wantGcs } = await inquirer.prompt<{ wantGcs: boolean }>({
      type: 'confirm',
      name: 'wantGcs',
      message: 'Do you have GCS service account credentials for snapshot datasets?',
      default: false,
    });

    if (!wantGcs) {
      delete example.gcsDatasetAccessCredentials;
    } else {
      const { gcsPath } = await inquirer.prompt<{ gcsPath: string }>({
        type: 'input',
        name: 'gcsPath',
        message: 'Path to GCS service account JSON file (leave empty to fill later):',
        default: '',
      });
      if (gcsPath.trim() && Fs.existsSync(gcsPath.trim())) {
        try {
          const gcsCreds = JSON.parse(Fs.readFileSync(gcsPath.trim(), 'utf-8'));
          example.gcsDatasetAccessCredentials = gcsCreds;
          log.info('GCS credentials loaded from file.');
        } catch {
          log.warning('Failed to parse GCS credentials file. Fill in config.json manually.');
        }
      }
    }
  }

  Fs.writeFileSync(configPath, JSON.stringify(example, null, 2) + '\n');
  log.info('');
  log.info(`Config written to ${VAULT_CONFIG_DIR}/${configFileName}`);
  log.info('Edit it to fill in any remaining REPLACE_ME values.');
  log.info('');
  log.info('Start an eval (config is loaded automatically):');
  log.info('  node scripts/evals start --suite <suite-id>');
  return true;
};

const checkVaultAuth = (): boolean => {
  return safeExec('vault', ['token', 'lookup', '-format=json']) !== null;
};

const fetchCcmApiKey = (log: { info: (msg: string) => void }): string => {
  log.info('Fetching EIS CCM API key from Vault...');
  const result = safeExec('vault', ['read', '-field=key', VAULT_SECRET_PATH]);
  if (!result) {
    throw new Error(
      [
        'Failed to read EIS CCM API key from Vault.',
        'Ensure you are logged in: vault login --method oidc',
        'And connected to VPN if needed.',
      ].join('\n')
    );
  }
  return result;
};

const runDiscoverEisModels = (repoRoot: string, apiKey: string): void => {
  const result = spawnSync('node', ['scripts/discover_eis_models.js'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, KIBANA_EIS_CCM_API_KEY: apiKey },
  });

  if (result.status !== 0) {
    throw new Error(`discover_eis_models failed with exit code ${result.status}`);
  }
};

const runGenerateEisConnectors = (repoRoot: string): string => {
  const scriptPath = Path.join(
    'x-pack/platform/packages/shared/kbn-evals/scripts/ci/generate_eis_connectors.js'
  );

  const result = spawnSync('node', [scriptPath, '--format=base64'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() ?? '';
    throw new Error(`generate_eis_connectors failed: ${stderr || `exit code ${result.status}`}`);
  }

  return result.stdout.trim();
};

const listConnectorIds = (base64Payload: string): Array<{ id: string; name: string }> => {
  try {
    const parsed = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8')) as Record<
      string,
      { name?: string }
    >;
    return Object.entries(parsed).map(([id, connector]) => ({
      id,
      name: connector?.name ?? id,
    }));
  } catch {
    return [];
  }
};

export const initCmd: Command<void> = {
  name: 'init',
  description: `
  Set up local config and connectors for running evals.

  Subcommands:
    node scripts/evals init              Full setup (config + connectors)
    node scripts/evals init config       Only create/update vault config.json

  Guides you through vault config creation and EIS (Cloud Connected Mode)
  connector discovery or validates an existing configuration.

  Examples:
    node scripts/evals init
    node scripts/evals init config
    node scripts/evals init config --profile local
    node scripts/evals init --skip-discovery
  `,
  flags: {
    boolean: ['skip-discovery'],
    string: ['profile'],
    default: { 'skip-discovery': false },
    help: `
      --profile <name>   Write config to config.<name>.json instead of config.json
                          (e.g. --profile local creates config.local.json)
      --skip-discovery    Skip EIS model discovery (only applies to full init)
    `,
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();
    const positionals = flagsReader.getPositionals();
    const configOnly = positionals.includes('config');
    const profile = flagsReader.string('profile') ?? undefined;

    const knownPositionals = new Set(['config']);
    const unknownPositionals = positionals.filter((p) => !knownPositionals.has(p));
    if (unknownPositionals.length > 0) {
      const hint = unknownPositionals.length === 1 && !profile ? unknownPositionals[0] : null;
      throw new Error(
        [
          `Unknown argument${unknownPositionals.length > 1 ? 's' : ''}: ${unknownPositionals.join(
            ', '
          )}`,
          hint
            ? `Did you mean --profile ${hint}? (e.g. node scripts/evals init config --profile ${hint})`
            : 'Use --profile <name> to specify a config profile name.',
        ].join('\n')
      );
    }

    log.info('Welcome to kbn-evals setup!');
    log.info('');

    // Step 0: Config init (always runs first)
    await runConfigInit(repoRoot, log, { profile });

    if (configOnly) {
      return;
    }

    const existingConnectors = parseConnectorsFromEnv();
    const hasExistingConnectors = existingConnectors.length > 0;
    const kibanaDevYmlConnectors = parseConnectorsFromKibanaDevYml(repoRoot);
    const hasKibanaDevYmlConnectors = kibanaDevYmlConnectors.length > 0;

    const choices = [{ name: 'EIS (Cloud Connected Mode) -- recommended', value: 'eis' }];
    if (hasKibanaDevYmlConnectors) {
      choices.push({
        name: `kibana.dev.yml (${kibanaDevYmlConnectors.length} preconfigured connector(s) found)`,
        value: 'kibana-dev-yml',
      });
    }
    if (hasExistingConnectors) {
      choices.push({
        name: `Already set (KIBANA_TESTING_AI_CONNECTORS has ${existingConnectors.length} connector(s))`,
        value: 'existing',
      });
    }

    const { connectorSource } = await inquirer.prompt<{ connectorSource: string }>({
      type: 'list',
      name: 'connectorSource',
      message: 'How are your LLM connectors configured?',
      choices,
    });

    if (connectorSource === 'existing') {
      log.info('');
      log.info('Available connectors:');
      existingConnectors.forEach((c) => log.info(`  - ${c.id} (${c.name})`));
      log.info('');
      log.info('You are all set! Run an eval with:');
      log.info('  node scripts/evals start --suite <suite-id>');
      log.info('  node scripts/evals run --suite <suite-id> --evaluation-connector-id <id>');
      return;
    }

    if (connectorSource === 'kibana-dev-yml') {
      log.info('');
      log.info(
        `Found ${kibanaDevYmlConnectors.length} preconfigured connector(s) in config/kibana.dev.yml:`
      );
      kibanaDevYmlConnectors.forEach((c) => log.info(`  - ${c.id} (${c.name})`));
      log.info('');
      log.info(
        'These connectors will be used automatically when KIBANA_TESTING_AI_CONNECTORS is not set.'
      );
      log.info('Set KBN_EVALS_SKIP_CONNECTOR_SETUP=true to skip connector setup/teardown.');
      log.info('');
      log.info('Run an eval with:');
      log.info(
        '  KBN_EVALS_SKIP_CONNECTOR_SETUP=true node scripts/evals run --suite <suite-id> --evaluation-connector-id <connector-id>'
      );
      return;
    }

    // --- EIS path ---
    log.info('');

    // 1. Check Vault auth
    log.info('Checking Vault auth...');
    if (!checkVaultAuth()) {
      log.error('Vault authentication failed. Please log in first:');
      log.error('  vault login --method oidc');
      log.error('');
      log.error('Then re-run: node scripts/evals init');
      throw new Error('Vault authentication required');
    }
    log.info('Vault auth OK');

    // 2. Fetch CCM API key
    const apiKey = fetchCcmApiKey(log);
    log.info('CCM API key retrieved');

    // 3. Discover EIS models (starts temp ES)
    if (!flagsReader.boolean('skip-discovery')) {
      log.info('');
      log.info('Discovering available EIS models (this starts a temporary ES cluster)...');
      log.info('');
      runDiscoverEisModels(repoRoot, apiKey);
    }

    // 4. Check models file exists
    const modelsPath = Path.resolve(repoRoot, EIS_MODELS_PATH);
    if (!Fs.existsSync(modelsPath)) {
      throw new Error(`EIS models file not found at ${modelsPath}. Run without --skip-discovery.`);
    }

    const modelsJson = JSON.parse(Fs.readFileSync(modelsPath, 'utf-8')) as {
      models: Array<{ inferenceId: string; modelId: string }>;
    };

    if (modelsJson.models.length === 0) {
      throw new Error(
        'No EIS models were discovered. Check that KIBANA_EIS_CCM_API_KEY is valid and VPN is connected.'
      );
    }

    log.info(`Found ${modelsJson.models.length} EIS model(s):`);
    modelsJson.models.forEach((m) => log.info(`  - ${m.modelId} (${m.inferenceId})`));

    // 5. Generate connectors payload
    log.info('');
    log.info('Generating connector payload...');
    const base64Payload = runGenerateEisConnectors(repoRoot);
    const connectors = listConnectorIds(base64Payload);

    if (connectors.length === 0) {
      throw new Error('No connectors generated from EIS models.');
    }

    log.info(`Generated ${connectors.length} connector(s)`);

    // 6. Output the export command
    log.info('');
    log.info('Done! Run the following to export connectors to your shell:');
    log.info('');
    log.info(`  export KIBANA_TESTING_AI_CONNECTORS="${base64Payload}"`);
    log.info('');
    log.info('Available connector IDs:');
    connectors.forEach((c) => log.info(`  - ${c.id}`));
    log.info('');
    log.info('Then start an eval:');
    log.info('  node scripts/evals start --suite <suite-id>');
    log.info('  node scripts/evals run --suite <suite-id> --evaluation-connector-id <id>');
  },
};
