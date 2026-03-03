/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { spawn } from 'child_process';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import type { ToolingLog } from '@kbn/tooling-log';
import { resolveEvalSuites } from '../suites';
import {
  promptForSuite,
  promptForConnector,
  promptForProject,
  isTTY,
  getAllAvailableConnectors,
  readLocalEsUrl,
  SCOUT_EVALS_ARGS,
} from '../prompts';
import {
  isServiceRunning,
  isScoutStale,
  startService,
  stopService,
  connectorsHash,
  tailLog,
} from '../services';
import { safeExec, VAULT_SECRET_PATH } from '../utils';

const SCOUT_LOCAL_CONFIG = '.scout/servers/local.json';
const SCOUT_READY_POLL_INTERVAL_MS = 3000;
const SCOUT_READY_TIMEOUT_MS = 180_000;

const fetchCcmApiKey = (log: ToolingLog): string => {
  const envKey = process.env.KIBANA_EIS_CCM_API_KEY;
  if (envKey) {
    return envKey;
  }

  log.info('KIBANA_EIS_CCM_API_KEY not set -- fetching from Vault...');
  const vaultOk = safeExec('vault', ['token', 'lookup', '-format=json']);
  if (!vaultOk) {
    throw new Error(
      [
        'Vault authentication required for EIS CCM.',
        'Log in first:  vault login --method oidc',
        'Or set KIBANA_EIS_CCM_API_KEY manually.',
      ].join('\n')
    );
  }

  const key = safeExec('vault', ['read', '-field=key', VAULT_SECRET_PATH]);
  if (!key) {
    throw new Error(
      [
        'Failed to read EIS CCM API key from Vault.',
        'Ensure VPN is connected and try:  vault login --method oidc',
      ].join('\n')
    );
  }
  return key;
};

const isEdotRunningViaDocker = (): boolean => {
  const result = safeExec('docker', [
    'ps',
    '--filter',
    'name=kibana-edot-collector',
    '--format',
    '{{.Names}}',
  ]);
  return result !== null && result.length > 0;
};

// Any HTTP response (including 401/503) means the service is listening.
// We only care that the port is up, not that auth is configured yet.
const probeHttp = async (url: string): Promise<boolean> => {
  try {
    await fetch(url, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
};

const waitForScoutReady = async (repoRoot: string, log: ToolingLog): Promise<void> => {
  const configPath = Path.join(repoRoot, SCOUT_LOCAL_CONFIG);
  const startTime = Date.now();
  let esUrl: string | undefined;
  let kbnUrl: string | undefined;

  while (Date.now() - startTime < SCOUT_READY_TIMEOUT_MS) {
    if (!esUrl && Fs.existsSync(configPath)) {
      try {
        const raw = Fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw) as { hosts?: { kibana?: string; elasticsearch?: string } };
        esUrl = parsed.hosts?.elasticsearch;
        kbnUrl = parsed.hosts?.kibana;
      } catch {
        // file not fully written yet
      }
    }

    if (esUrl && kbnUrl) {
      const [esOk, kbnOk] = await Promise.all([
        probeHttp(esUrl),
        probeHttp(`${kbnUrl}/api/status`),
      ]);
      if (esOk && kbnOk) {
        return;
      }
    }

    await new Promise((r) => setTimeout(r, SCOUT_READY_POLL_INTERVAL_MS));
  }

  throw new Error(`Scout did not become ready within ${SCOUT_READY_TIMEOUT_MS / 1000}s`);
};

const isEisConnectorId = (id: string): boolean => id.startsWith('eis-');

const ensureSuite = (suiteId: string, repoRoot: string, log: ToolingLog) => {
  const suites = resolveEvalSuites(repoRoot, log);
  const match = suites.find((suite) => suite.id === suiteId);
  if (match) return match;

  log.info(`Suite "${suiteId}" not found in metadata; refreshing discovery...`);
  const refreshed = resolveEvalSuites(repoRoot, log, { refresh: true });
  const refreshedMatch = refreshed.find((suite) => suite.id === suiteId);
  if (refreshedMatch) return refreshedMatch;

  const available = refreshed.map((suite) => suite.id).join(', ');
  throw createFlagError(
    `Unknown suite "${suiteId}". Available suites: ${available || 'none found'}`
  );
};

export const startCmd: Command<void> = {
  name: 'start',
  description: `
  Start the full eval stack (EDOT collector + Scout server + EIS CCM) and run an eval suite.

  Services (EDOT, Scout) run as background daemons and persist between eval runs.
  Use \`node scripts/evals stop\` to shut them down.

  Examples:
    node scripts/evals start
    node scripts/evals start --suite agent-builder
    node scripts/evals start --suite agent-builder --model eis-gpt-4.1
    node scripts/evals start --suite agent-builder --model eis-gpt-4.1,eis-claude-4-sonnet
    node scripts/evals start --suite agent-builder --grep "product documentation"
    node scripts/evals start --suite agent-builder --skip-server
    node scripts/evals stop
  `,
  flags: {
    string: ['suite', 'config', 'evaluation-connector-id', 'project', 'repetitions', 'grep'],
    boolean: ['skip-server', 'dry-run'],
    alias: { model: 'project', judge: 'evaluation-connector-id' },
    default: { 'skip-server': false, 'dry-run': false },
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();

    // --- Resolve suite ---
    let suiteId = flagsReader.string('suite');
    const configPath = flagsReader.string('config');

    if (!suiteId && !configPath) {
      if (isTTY()) {
        const selected = await promptForSuite(repoRoot, log);
        suiteId = selected.id;
      } else {
        throw createFlagError('Missing --suite (or provide --config).');
      }
    }

    if (suiteId && configPath) {
      throw createFlagError('Use either --suite or --config, not both.');
    }

    const suite = suiteId ? ensureSuite(suiteId, repoRoot, log) : undefined;
    const resolvedConfigPath = suite
      ? suite.absoluteConfigPath
      : Path.resolve(repoRoot, configPath as string);

    // --- Resolve connector ---
    let evaluationConnectorId =
      flagsReader.string('evaluation-connector-id') ?? process.env.EVALUATION_CONNECTOR_ID;

    if (!evaluationConnectorId) {
      if (isTTY()) {
        evaluationConnectorId = await promptForConnector(repoRoot, log);
      } else {
        throw createFlagError(
          'EVALUATION_CONNECTOR_ID is required. Set --evaluation-connector-id or env.'
        );
      }
    }

    // --- Resolve project (which model(s) to evaluate) ---
    let projects: string[] = [];
    const projectFlag = flagsReader.string('project');

    if (projectFlag) {
      projects = projectFlag.split(',').map((p) => p.trim());
    } else {
      const allConnectors = getAllAvailableConnectors(repoRoot);
      if (allConnectors.length > 1 && isTTY()) {
        projects = await promptForProject(repoRoot, log);
      }
    }

    const skipServer = flagsReader.boolean('skip-server');
    const requiresEisCcm =
      isEisConnectorId(evaluationConnectorId) ||
      (projects.length > 0
        ? projects.some(isEisConnectorId)
        : getAllAvailableConnectors(repoRoot).some((c) => isEisConnectorId(c.id)));

    log.info('');
    log.info(`Suite:     ${suiteId ?? configPath}`);
    log.info(`Judge:     ${evaluationConnectorId}`);
    if (projects.length > 0) {
      log.info(`Models:    ${projects.join(', ')}`);
    } else {
      log.info(`Models:    all (from KIBANA_TESTING_AI_CONNECTORS)`);
    }
    log.info(`Server:    ${skipServer ? 'skip (using existing)' : 'managed'}`);
    log.info('');

    if (flagsReader.boolean('dry-run')) {
      log.info('Dry run -- exiting.');
      return;
    }

    if (!skipServer) {
      // --- Step 1: EDOT collector (uses kibana.dev.yml ES defaults, no dependencies) ---
      if (isServiceRunning(repoRoot, 'edot') || isEdotRunningViaDocker()) {
        log.info('[1/4] EDOT collector already running -- reusing');
      } else {
        log.info('[1/4] Starting EDOT collector (backgrounded, exporting to kibana.dev.yml ES)...');

        startService(repoRoot, 'edot', 'node', ['scripts/edot_collector.js'], log);

        const stopTail = tailLog(repoRoot, 'edot', log, { fromStart: true });
        await new Promise((r) => setTimeout(r, 5000));
        stopTail();

        if (!isEdotRunningViaDocker()) {
          log.warning(
            'EDOT collector may not have started. Check logs: node scripts/evals logs --service edot'
          );
        } else {
          log.info('[1/4] EDOT collector started');
        }
      }

      // --- Step 2: Scout server ---
      const scoutAlive = isServiceRunning(repoRoot, 'scout');
      const scoutStale = scoutAlive && isScoutStale(repoRoot);

      if (scoutStale) {
        log.warning(
          '[2/4] Scout connectors are stale (KIBANA_TESTING_AI_CONNECTORS changed). Restarting...'
        );
        await stopService(repoRoot, 'scout', log);
      }

      if (scoutAlive && !scoutStale) {
        log.info('[2/4] Scout server already running -- reusing');
      } else {
        const scoutConfigPath = Path.join(repoRoot, SCOUT_LOCAL_CONFIG);
        if (Fs.existsSync(scoutConfigPath)) {
          Fs.unlinkSync(scoutConfigPath);
        }

        log.info('[2/4] Starting Scout server (backgrounded, stateful/classic, evals_tracing)...');
        startService(repoRoot, 'scout', 'node', ['scripts/scout.js', ...SCOUT_EVALS_ARGS], log, {
          connectorsHash: connectorsHash(),
        });

        const stopTail = tailLog(repoRoot, 'scout', log, { fromStart: true });
        log.info('[2/4] Waiting for ES + Kibana to be ready...');
        await waitForScoutReady(repoRoot, log);
        stopTail();
        log.info('[2/4] Scout server ready');
      }

      // --- Step 3: EIS CCM ---
      if (requiresEisCcm) {
        log.info('[3/4] Enabling EIS (Cloud Connected Mode)...');
        const ccmApiKey = fetchCcmApiKey(log);

        const ccmResult = spawn(
          'node',
          ['x-pack/platform/packages/shared/kbn-evals/scripts/local_repros/enable_eis_ccm.js'],
          {
            cwd: repoRoot,
            stdio: 'inherit',
            env: { ...process.env, KIBANA_EIS_CCM_API_KEY: ccmApiKey },
          }
        );

        await new Promise<void>((resolve, reject) => {
          ccmResult.on('exit', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`enable_eis_ccm exited with code ${code}`));
            }
          });
          ccmResult.on('error', reject);
        });

        log.info('[3/4] EIS CCM enabled');
      } else {
        log.info('[3/4] Skipping EIS CCM (no eis- judge/models selected)');
      }
    }

    // --- Step 4: Run the eval suite ---
    log.info(`[4/4] Running suite: ${suiteId ?? configPath}`);
    log.info('');

    const envOverrides: Record<string, string> = {
      EVALUATION_CONNECTOR_ID: evaluationConnectorId,
    };

    const localEsUrl = readLocalEsUrl(repoRoot);

    if (!process.env.TRACING_ES_URL && localEsUrl) {
      envOverrides.TRACING_ES_URL = localEsUrl;
      log.info(`Trace evaluators will query: ${localEsUrl}`);
    }

    if (!process.env.EVALUATIONS_ES_URL && localEsUrl) {
      envOverrides.EVALUATIONS_ES_URL = localEsUrl;
      log.info(`Evaluation results will export to: ${localEsUrl}`);
    }

    const repetitions = flagsReader.string('repetitions');
    if (repetitions) {
      envOverrides.EVALUATION_REPETITIONS = repetitions;
    }

    const args = ['scripts/playwright', 'test', '--config', resolvedConfigPath];
    for (const p of projects) {
      args.push('--project', p);
    }

    const grep = flagsReader.string('grep');
    if (grep) {
      args.push('--grep', grep);
    }

    await new Promise<void>((resolve, reject) => {
      const child = spawn('node', args, {
        cwd: repoRoot,
        stdio: 'inherit',
        env: { ...process.env, ...envOverrides },
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Playwright exited with code ${code}`));
        }
      });
      child.on('error', reject);
    });

    log.info('');
    log.info('EDOT and Scout are still running in the background.');
    log.info('To stop them: node scripts/evals stop');
  },
};
