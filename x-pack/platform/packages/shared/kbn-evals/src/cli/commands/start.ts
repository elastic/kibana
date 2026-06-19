/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn } from 'child_process';
import type { Command } from '@kbn/dev-cli-runner';
import { ensureEvalStack } from '../eval_stack';
import {
  ensureEvalInit,
  resolveEvalSuite,
  resolveEvalRunContext,
  buildEvalRunArgs,
  buildEvalRunEnv,
  formatEvalCliCommand,
  evalRunFlags,
} from '../run_helpers';
  promptForSuite,
  promptForConnector,
  promptForProject,
  isTTY,
  getAllAvailableConnectors,
  scoutEvalsArgs,
} from '../prompts';
import {
  isServiceRunning,
  isScoutStale,
  startService,
  stopService,
  connectorsHash,
  scoutEnvHash,
  tailLog,
  isEdotDockerRunning,
} from '../services';
import { readCachedEisConnectors } from '../eis_connectors_cache';
import {
  defaultExportProfile,
  envFromDatasetsProfile,
  envFromExportProfile,
  stripTrailingSlash,
  probeHttp,
  isExportProfileImplicitLocal,
  isDevVaultProfile,
  resolveVaultConfigPath,
} from '../profiles';
import { runConfigInit, runConnectorSetup, ensureVaultAuth, ensureLocalConfig } from './init';

const SCOUT_LOCAL_CONFIG = '.scout/servers/local.json';
const SCOUT_READY_POLL_INTERVAL_MS = 3000;
const SCOUT_READY_TIMEOUT_MS = 180_000;

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

/**
 * Verify the Scout-managed ES and Kibana are actually reachable, not just that
 * the parent PID is alive. Covers the common case where ES crashes while the
 * Scout orchestrator (and Kibana) keep running.
 */
const probeScoutHealth = async (repoRoot: string): Promise<{ ok: boolean; reason?: string }> => {
  const configPath = Path.join(repoRoot, SCOUT_LOCAL_CONFIG);
  if (!Fs.existsSync(configPath)) {
    return { ok: false, reason: 'local config missing (.scout/servers/local.json)' };
  }

  try {
    const raw = Fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as { hosts?: { kibana?: string; elasticsearch?: string } };
    const esUrl = parsed.hosts?.elasticsearch;
    const kbnUrl = parsed.hosts?.kibana;

    if (!esUrl || !kbnUrl) {
      return { ok: false, reason: 'hosts missing from local config' };
    }

    const [esOk, kbnOk] = await Promise.all([probeHttp(esUrl), probeHttp(`${kbnUrl}/api/status`)]);

    if (!esOk && !kbnOk) {
      return { ok: false, reason: `ES (${esUrl}) and Kibana (${kbnUrl}) are unreachable` };
    }
    if (!esOk) {
      return { ok: false, reason: `ES is unreachable (${esUrl})` };
    }
    if (!kbnOk) {
      return { ok: false, reason: `Kibana is unreachable (${kbnUrl})` };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: 'failed to read local config' };
  }
};

const isEisConnectorId = (id: string): boolean => id.startsWith('eis-');

const shellQuote = (value: string): string => {
  // Prefer single quotes for bash/zsh. If the string contains single quotes, fall back to double quotes.
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  const escaped = value.replace(/(["\\$`])/g, '\\$1');
  return `"${escaped}"`;
};

const formatRerunCommand = (args: string[]): string =>
  ['node', 'scripts/evals', ...args.map((a) => (a.includes(' ') ? shellQuote(a) : a))].join(' ');

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
  flags: evalRunFlags,
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();
    const profile = await ensureEvalInit(repoRoot, log, flagsReader);

    const { suite, suiteId, configPath, resolvedConfigPath } = await resolveEvalSuite(
      repoRoot,
      log,
      flagsReader
    );

    const {
      evaluationConnectorId,
      projects,
      profileEnvOverrides,
      exportProfile,
      datasetsProfile,
      requiresEisCcm,
    } = await resolveEvalRunContext({ repoRoot, log, flagsReader, profile });

    const skipServer = flagsReader.boolean('skip-server');

    log.info('');
    log.info(`Suite:     ${suiteId ?? configPath}`);
    log.info(`Judge:     ${evaluationConnectorId}`);
    if (projects.length > 0) {
      log.info(`Models:    ${projects.join(', ')}`);
    } else {
      log.info(`Models:    all (from KIBANA_TESTING_AI_CONNECTORS)`);
    }
    log.info(`Server:    ${skipServer ? 'skip (using existing)' : 'managed'}`);
    if (suite?.serverConfigSet) {
      log.info(`Config:    ${suite.serverConfigSet}`);
    }
    log.info(
      `Profiles:  datasets=${datasetsProfile ?? 'config'} export=${exportProfile ?? 'none'}`
    );
    log.info('');

    const rerunArgs = buildEvalRunArgs({
      suiteId,
      configPath,
      evaluationConnectorId,
      projects,
      profile,
      flagsReader,
      skipServer,
    });

    log.info(`Re-run command: ${formatEvalCliCommand(['start', ...rerunArgs])}`);
    log.info('');

    if (flagsReader.boolean('dry-run')) {
      log.info('Dry run -- exiting.');
      return;
    }

    if (!skipServer) {
      await ensureEvalStack({
        repoRoot,
        log,
        profileEnvOverrides,
        serverConfigSet: suite?.serverConfigSet,
        requiresEisCcm,
      });
      // --- Step 1: EDOT collector (exports traces to configured ES) ---
      if (isServiceRunning(repoRoot, 'edot') || isEdotDockerRunning()) {
        log.info('[1/4] EDOT collector already running -- reusing');
      } else {
        log.info('[1/4] Starting EDOT collector (backgrounded)...');

        const elasticsearchHost = profileEnvOverrides.TRACING_ES_URL;
        if (elasticsearchHost) {
          log.info(`[1/4] EDOT collector will export to: ${elasticsearchHost}`);
        }
        startService(repoRoot, 'edot', 'node', ['scripts/edot_collector.js'], log, {
          env: elasticsearchHost ? { ELASTICSEARCH_HOST: elasticsearchHost } : undefined,
        });

        const stopTail = tailLog(repoRoot, 'edot', log, { fromStart: true });
        await new Promise((r) => setTimeout(r, 5000));
        stopTail();

        if (!isEdotDockerRunning()) {
          log.warning(
            'EDOT collector may not have started. Check logs: node scripts/evals logs --service edot'
          );
        } else {
          log.info('[1/4] EDOT collector started');
        }
      }

      // --- Step 2: Scout server ---
      const serverConfigSet = suite?.serverConfigSet ?? 'evals_tracing';
      const scoutEnv: Record<string, string> = {};
      if (profileEnvOverrides.GCS_CREDENTIALS) {
        scoutEnv.GCS_CREDENTIALS = profileEnvOverrides.GCS_CREDENTIALS;
      }
      if (profileEnvOverrides.TRACING_EXPORTERS) {
        scoutEnv.TRACING_EXPORTERS = profileEnvOverrides.TRACING_EXPORTERS;
      }

      const scoutAlive = isServiceRunning(repoRoot, 'scout');
      const staleCheck = scoutAlive
        ? isScoutStale(repoRoot, serverConfigSet, scoutEnv)
        : { stale: false };

      if (staleCheck.stale) {
        log.warning(`[2/4] Scout server is stale (${staleCheck.reason}). Restarting...`);
        await stopService(repoRoot, 'scout', log);
      }

      let scoutReusable = scoutAlive && !staleCheck.stale;

      if (scoutReusable) {
        const health = await probeScoutHealth(repoRoot);
        if (!health.ok) {
          log.warning(`[2/4] Scout PID alive but ${health.reason}. Restarting...`);
          await stopService(repoRoot, 'scout', log);
          scoutReusable = false;
        }
      }

      if (scoutReusable) {
        log.info('[2/4] Scout server already running -- reusing');
      } else {
        const scoutConfigPath = Path.join(repoRoot, SCOUT_LOCAL_CONFIG);
        if (Fs.existsSync(scoutConfigPath)) {
          Fs.unlinkSync(scoutConfigPath);
        }

        log.info(
          `[2/4] Starting Scout server (backgrounded, stateful/classic, ${serverConfigSet})...`
        );
        startService(
          repoRoot,
          'scout',
          'node',
          ['scripts/scout.js', ...scoutEvalsArgs(serverConfigSet)],
          log,
          {
            connectorsHash: connectorsHash(),
            serverConfigSet,
            envHash: scoutEnvHash(scoutEnv),
            env: Object.keys(scoutEnv).length > 0 ? scoutEnv : undefined,
          }
        );

        const stopTail = tailLog(repoRoot, 'scout', log, { fromStart: true });
        log.info('[2/4] Waiting for ES + Kibana to be ready...');
        await waitForScoutReady(repoRoot, log);
        stopTail();
        log.info('[2/4] Scout server ready');
      }

      // --- Step 3: EIS CCM ---
      if (requiresEisCcm) {
        log.info('[3/4] Enabling EIS (Cloud Connected Mode)...');
        const ccmApiKey = await resolveCcmApiKey(log);

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

    log.info(`[4/4] Running suite: ${suiteId ?? configPath}`);
    log.info('');

    const envOverrides = buildEvalRunEnv({
      evaluationConnectorId,
      requiresEisCcm,
      skipServer,
      suite,
      profileEnvOverrides,
      flagsReader,
      log,
    });

    const args = ['scripts/playwright', 'test', '--config', resolvedConfigPath];
    for (const p of projects) {
      args.push('--project', p);
    }

    const grep = flagsReader.string('grep');
    if (grep) {
      args.push('--grep', grep);
    }

    await new Promise<void>((resolve, reject) => {
      const childEnv: Record<string, string> = { ...process.env, ...envOverrides } as Record<
        string,
        string
      >;
      delete childEnv.NO_COLOR;
      const child = spawn('node', args, {
        cwd: repoRoot,
        stdio: 'inherit',
        env: childEnv,
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
