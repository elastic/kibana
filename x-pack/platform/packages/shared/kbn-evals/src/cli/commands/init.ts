/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execSync, spawnSync, spawn } from 'child_process';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import inquirer from 'inquirer';
import type { Command } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { set } from '@kbn/safer-lodash-set';
import { isTTY, parseConnectorsFromEnv, parseConnectorsFromKibanaDevYml } from '../prompts';
import { safeExec, getVaultAddr, VAULT_SECRET_PATH } from '../utils';
import { VAULT_CONFIG_DIR } from '../profiles';
import { buildApiKeyPayload } from '../../api_key/build_api_key_payload';

const EIS_MODELS_PATH = 'target/eis_models.json';

const CONFIG_FILENAME = 'config.json';
const CONFIG_EXAMPLE_FILENAME = 'config.example.json';

const GOLDEN_CLUSTER_ES_URL =
  'https://kbn-evals-serverless-ed035a.es.us-central1.gcp.elastic.cloud';
const GOLDEN_CLUSTER_KBN_URL =
  'https://kbn-evals-serverless-ed035a.kb.us-central1.gcp.elastic.cloud';
const GOLDEN_CLUSTER_INGEST_URL =
  'https://kbn-evals-serverless-ed035a.ingest.us-central1.gcp.elastic.cloud:443/v1/traces';
const GOLDEN_CLUSTER_DEV_TOOLS_URL = `${GOLDEN_CLUSTER_KBN_URL}/app/dev_tools#/console`;

type InfraTarget = 'golden-cluster' | 'local' | 'custom';

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
  log: ToolingLog
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
    set(config, field, trimmed);
  }

  set(config, 'tracingExporters[0].http.headers.Authorization', `ApiKey ${trimmed}`);

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

export const runConfigInit = async (
  repoRoot: string,
  log: ToolingLog,
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
  const defaultTarget: InfraTarget = profile === 'local' ? 'local' : 'golden-cluster';

  log.info('');

  const { target } = await inquirer.prompt<{ target: InfraTarget }>({
    type: 'list',
    name: 'target',
    message: 'Where should evals infrastructure point to?',
    choices: [
      { name: 'Golden cluster (kbn-evals-serverless)', value: 'golden-cluster' },
      { name: 'Local (localhost)', value: 'local' },
      { name: 'Custom', value: 'custom' },
    ],
    default: defaultTarget,
  });

  log.info('');

  if (target === 'golden-cluster') {
    set(example, 'evaluationsEs.url', GOLDEN_CLUSTER_ES_URL);
    set(example, 'evaluationsKbn.url', GOLDEN_CLUSTER_KBN_URL);
    set(example, 'tracingEs.url', GOLDEN_CLUSTER_ES_URL);
    example.tracingExporters = [
      { http: { url: GOLDEN_CLUSTER_INGEST_URL, headers: { Authorization: 'ApiKey REPLACE_ME' } } },
    ];

    let reusingKey = false;
    if (existingApiKey) {
      const { reuseKey } = await inquirer.prompt<{ reuseKey: boolean }>({
        type: 'confirm',
        name: 'reuseKey',
        message: 'Existing API key found in previous config. Reuse it?',
        default: true,
      });
      if (reuseKey) {
        reusingKey = true;
        for (const field of API_KEY_FIELDS) {
          set(example, field, existingApiKey);
        }
        set(example, 'tracingExporters[0].http.headers.Authorization', `ApiKey ${existingApiKey}`);
        log.info('Reusing existing API key for all golden cluster fields.');
        log.info('');
      }
    }

    if (!reusingKey) {
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
        log.info('Enter the API key manually. Press Enter to skip and fill in config.json later.');
        log.info('');

        const { value } = await inquirer.prompt<{ value: string }>({
          type: 'password',
          name: 'value',
          message: 'Golden cluster API key:',
          mask: '*',
        });

        const trimmed = value.trim();
        if (trimmed) {
          for (const field of API_KEY_FIELDS) {
            set(example, field, trimmed);
          }
          set(example, 'tracingExporters[0].http.headers.Authorization', `ApiKey ${trimmed}`);
          log.info(
            'API key applied to evaluationsEs, tracingEs, evaluationsKbn, and tracingExporters.'
          );
        }
      }
    }

    const { wantOverride } = await inquirer.prompt<{ wantOverride: boolean }>({
      type: 'confirm',
      name: 'wantOverride',
      message: 'Override individual API keys?',
      default: false,
    });

    if (wantOverride) {
      const overrideFields = [
        { jsonPath: 'evaluationsEs.apiKey', label: 'Evaluations ES API key' },
        { jsonPath: 'evaluationsKbn.apiKey', label: 'Evaluations Kibana API key' },
        { jsonPath: 'tracingEs.apiKey', label: 'Tracing ES API key' },
        {
          jsonPath: 'tracingExporters[0].http.headers.Authorization',
          label: 'Tracing exporter Authorization header (e.g. ApiKey ...)',
        },
      ];

      for (const field of overrideFields) {
        const currentValue = getNestedValue(example, field.jsonPath);
        const defaultValue = typeof currentValue === 'string' ? currentValue : '';
        const { value } = await inquirer.prompt<{ value: string }>({
          type: 'password',
          name: 'value',
          message: `${field.label}:`,
          mask: '*',
          default: defaultValue,
        });
        if (value.trim()) {
          set(example, field.jsonPath, value.trim());
        }
      }
    }
  } else if (target === 'local') {
    const { basePath } = await inquirer.prompt<{ basePath: string }>({
      type: 'input',
      name: 'basePath',
      message: 'Kibana base path:',
      default: '/dev',
    });

    const normalizedBasePath = basePath.trim() || '/dev';

    set(example, 'evaluationsEs.url', 'http://elastic:changeme@localhost:9200');
    set(example, 'evaluationsEs.apiKey', '');
    set(
      example,
      'evaluationsKbn.url',
      `http://elastic:changeme@localhost:5601${normalizedBasePath}`
    );
    set(example, 'evaluationsKbn.apiKey', '');
    set(example, 'tracingEs.url', 'http://elastic:changeme@localhost:9200');
    set(example, 'tracingEs.apiKey', '');
    example.tracingExporters = [{ http: { url: 'http://localhost:4318/v1/traces' } }];
  } else {
    const urlFields = [
      { jsonPath: 'evaluationsEs.url', label: 'Evaluations ES URL' },
      { jsonPath: 'evaluationsKbn.url', label: 'Evaluations Kibana URL' },
      { jsonPath: 'tracingEs.url', label: 'Tracing ES URL' },
    ];

    for (const field of urlFields) {
      const { value } = await inquirer.prompt<{ value: string }>({
        type: 'input',
        name: 'value',
        message: `${field.label}:`,
      });
      if (value.trim()) {
        set(example, field.jsonPath, value.trim());
      }
    }

    const { tracingExporterUrl } = await inquirer.prompt<{ tracingExporterUrl: string }>({
      type: 'input',
      name: 'tracingExporterUrl',
      message: 'Tracing exporter URL:',
    });

    if (tracingExporterUrl.trim()) {
      example.tracingExporters = [{ http: { url: tracingExporterUrl.trim() } }];
    }

    log.info('');

    const apiKeyFields = [
      { jsonPath: 'evaluationsEs.apiKey', label: 'Evaluations ES API key' },
      { jsonPath: 'evaluationsKbn.apiKey', label: 'Evaluations Kibana API key' },
      { jsonPath: 'tracingEs.apiKey', label: 'Tracing ES API key' },
      {
        jsonPath: 'tracingExporters[0].http.headers.Authorization',
        label: 'Tracing exporter Authorization header (e.g. ApiKey ...)',
      },
    ];

    for (const field of apiKeyFields) {
      const { value } = await inquirer.prompt<{ value: string }>({
        type: 'password',
        name: 'value',
        message: `${field.label}:`,
        mask: '*',
      });
      set(example, field.jsonPath, value.trim() || '');
    }
  }

  const litellmVirtualKey = getNestedValue(example, 'litellm.virtualKey');
  if (typeof litellmVirtualKey === 'string' && litellmVirtualKey.includes('REPLACE_ME')) {
    const { value } = await inquirer.prompt<{ value: string }>({
      type: 'password',
      name: 'value',
      message: 'LiteLLM virtual key (sk-...):',
      mask: '*',
    });
    if (value.trim()) {
      set(example, 'litellm.virtualKey', value.trim());
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
      set(example, 'litellm.teamId', value.trim());
    }
  }

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

const vaultLogin = async (log: ToolingLog): Promise<void> => {
  const vaultAddr = getVaultAddr();
  log.info(`Launching Vault OIDC login against ${vaultAddr}...`);
  log.info('A browser window should open. If it does not, follow the URL printed below.');

  const child = spawn('vault', ['login', '--method', 'oidc'], {
    env: { ...process.env, VAULT_ADDR: vaultAddr },
    stdio: 'inherit',
  });

  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on('error', (err) => reject(err));
    child.on('exit', (code) => resolve(code));
  });

  if (exitCode !== 0) {
    throw new Error(
      [
        `Vault login failed (exit code ${exitCode}).`,
        '',
        'See https://docs.elastic.dev/vault for setup instructions.',
      ].join('\n')
    );
  }
};

const ensureVaultAuth = async (log: ToolingLog): Promise<void> => {
  if (checkVaultAuth()) {
    return;
  }
  log.info('Vault session expired or not found — attempting login...');
  await vaultLogin(log);
  if (!checkVaultAuth()) {
    throw new Error('Vault authentication still failing after login attempt.');
  }
};

const fetchCcmApiKey = (log: ToolingLog): string => {
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

export const runConnectorSetup = async (
  repoRoot: string,
  log: ToolingLog,
  options?: { skipDiscovery?: boolean }
): Promise<void> => {
  if (!isTTY()) {
    throw new Error(
      'No connectors available. Set KIBANA_TESTING_AI_CONNECTORS or run with a TTY to use the setup wizard.'
    );
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

  log.info('');

  const vaultAddr = getVaultAddr();

  log.info(`Checking Vault auth (VAULT_ADDR=${vaultAddr})...`);
  await ensureVaultAuth(log);
  log.info('Vault auth OK');

  const apiKey = fetchCcmApiKey(log);
  log.info('CCM API key retrieved');

  if (!(options?.skipDiscovery ?? false)) {
    log.info('');
    log.info('Discovering available EIS models (this starts a temporary ES cluster)...');
    log.info('');
    runDiscoverEisModels(repoRoot, apiKey);
  }

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

  log.info('');
  log.info('Generating connector payload...');
  const base64Payload = runGenerateEisConnectors(repoRoot);
  const connectors = listConnectorIds(base64Payload);

  if (connectors.length === 0) {
    throw new Error('No connectors generated from EIS models.');
  }

  log.info(`Generated ${connectors.length} connector(s)`);

  log.info('');
  log.info('Done! Run the following to export connectors to your shell:');
  log.info('');
  log.info(`  export KIBANA_TESTING_AI_CONNECTORS="${base64Payload}"`);
  process.env.KIBANA_TESTING_AI_CONNECTORS = base64Payload;
  log.info('');
  log.info('Available connector IDs:');
  connectors.forEach((c) => log.info(`  - ${c.id}`));
  log.info('');
  log.info('Then start an eval:');
  log.info('  node scripts/evals start --suite <suite-id>');
  log.info('  node scripts/evals run --suite <suite-id> --evaluation-connector-id <id>');
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
    await runConfigInit(repoRoot, log, { profile });
    if (!configOnly) {
      await runConnectorSetup(repoRoot, log, {
        skipDiscovery: flagsReader.boolean('skip-discovery'),
      });
    }
  },
};
