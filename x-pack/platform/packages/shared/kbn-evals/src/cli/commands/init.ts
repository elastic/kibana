/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'child_process';
import Fs from 'fs';
import Path from 'path';
import inquirer from 'inquirer';
import type { Command } from '@kbn/dev-cli-runner';
import { parseConnectorsFromEnv, parseConnectorsFromKibanaDevYml } from '../prompts';
import { safeExec, VAULT_SECRET_PATH } from '../utils';

const EIS_MODELS_PATH = 'target/eis_models.json';

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
  Set up connectors for running evals locally.

  Guides you through EIS (Cloud Connected Mode) connector discovery or
  validates an existing KIBANA_TESTING_AI_CONNECTORS configuration.

  Examples:
    node scripts/evals init
    node scripts/evals init --skip-discovery
  `,
  flags: {
    boolean: ['skip-discovery'],
    default: { 'skip-discovery': false },
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();

    log.info('Welcome to kbn-evals setup!');
    log.info('');

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
