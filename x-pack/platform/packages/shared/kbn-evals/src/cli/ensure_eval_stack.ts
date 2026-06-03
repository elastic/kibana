/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { spawn } from 'child_process';
import type { ToolingLog } from '@kbn/tooling-log';
import { resolveCcmApiKey } from '@kbn/es';
import { scoutEvalsArgs } from './prompts';
import {
  isServiceRunning,
  isScoutStale,
  startService,
  stopService,
  connectorsHash,
  tailLog,
  isEdotDockerRunning,
} from './services';
import { probeHttp } from './profiles';

export const SCOUT_LOCAL_CONFIG = '.scout/servers/local.json';
const SCOUT_READY_POLL_INTERVAL_MS = 3000;
const SCOUT_READY_TIMEOUT_MS = 180_000;

export const isEisConnectorId = (id: string): boolean => id.startsWith('eis-');

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

export interface EnsureEvalStackOptions {
  repoRoot: string;
  log: ToolingLog;
  /** Scout server config set (e.g. `evals_tracing`). */
  serverConfigSet: string;
  /** When true, enable EIS Cloud Connected Mode (required for eis- connectors/models). */
  requiresEisCcm: boolean;
  /**
   * Profile-derived env overrides. The Scout server consumes `GCS_CREDENTIALS` and
   * `TRACING_EXPORTERS`; EDOT exports traces to `TRACING_ES_URL`.
   */
  profileEnvOverrides: Record<string, string>;
}

/**
 * Boots the local eval stack as background daemons (EDOT collector + Scout server),
 * then enables EIS CCM when needed. Idempotent: reuses healthy services and restarts
 * stale/unreachable ones. Shared by the `start` and `red-team` CLI commands.
 *
 * Services persist between eval runs; stop them with `node scripts/evals stop`.
 */
export const ensureEvalStack = async ({
  repoRoot,
  log,
  serverConfigSet,
  requiresEisCcm,
  profileEnvOverrides,
}: EnsureEvalStackOptions): Promise<void> => {
  // --- Step 1: EDOT collector (exports traces to configured ES) ---
  if (isServiceRunning(repoRoot, 'edot') || isEdotDockerRunning()) {
    log.info('[1/3] EDOT collector already running -- reusing');
  } else {
    log.info('[1/3] Starting EDOT collector (backgrounded)...');

    const elasticsearchHost = profileEnvOverrides.TRACING_ES_URL;
    if (elasticsearchHost) {
      log.info(`[1/3] EDOT collector will export to: ${elasticsearchHost}`);
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
      log.info('[1/3] EDOT collector started');
    }
  }

  // --- Step 2: Scout server ---
  const scoutAlive = isServiceRunning(repoRoot, 'scout');
  const staleCheck = scoutAlive ? isScoutStale(repoRoot, serverConfigSet) : { stale: false };

  if (staleCheck.stale) {
    log.warning(`[2/3] Scout server is stale (${staleCheck.reason}). Restarting...`);
    await stopService(repoRoot, 'scout', log);
  }

  let scoutReusable = scoutAlive && !staleCheck.stale;

  if (scoutReusable) {
    const health = await probeScoutHealth(repoRoot);
    if (!health.ok) {
      log.warning(`[2/3] Scout PID alive but ${health.reason}. Restarting...`);
      await stopService(repoRoot, 'scout', log);
      scoutReusable = false;
    }
  }

  if (scoutReusable) {
    log.info('[2/3] Scout server already running -- reusing');
  } else {
    const scoutConfigPath = Path.join(repoRoot, SCOUT_LOCAL_CONFIG);
    if (Fs.existsSync(scoutConfigPath)) {
      Fs.unlinkSync(scoutConfigPath);
    }

    log.info(`[2/3] Starting Scout server (backgrounded, stateful/classic, ${serverConfigSet})...`);
    // Forward the env overrides that the Scout server config consumes
    // when launching ES / Kibana. Notably:
    //   - GCS_CREDENTIALS  -> ES gcs.client.default.credentials_file
    //                        secure setting (snapshot restore from GCS)
    //   - TRACING_EXPORTERS -> Kibana --telemetry.tracing.exporters
    //                         (fan-out OTLP destinations from config.json)
    // Without TRACING_EXPORTERS, Scout falls back to the localhost:4318
    // + phoenix defaults in `classic.stateful.config.ts`, so any custom
    // tracing destinations declared in the vault profile are silently
    // dropped.
    const scoutEnv: Record<string, string> = {};
    if (profileEnvOverrides.GCS_CREDENTIALS) {
      scoutEnv.GCS_CREDENTIALS = profileEnvOverrides.GCS_CREDENTIALS;
    }
    if (profileEnvOverrides.TRACING_EXPORTERS) {
      scoutEnv.TRACING_EXPORTERS = profileEnvOverrides.TRACING_EXPORTERS;
    }

    startService(
      repoRoot,
      'scout',
      'node',
      ['scripts/scout.js', ...scoutEvalsArgs(serverConfigSet)],
      log,
      {
        connectorsHash: connectorsHash(),
        serverConfigSet,
        env: Object.keys(scoutEnv).length > 0 ? scoutEnv : undefined,
      }
    );

    const stopTail = tailLog(repoRoot, 'scout', log, { fromStart: true });
    log.info('[2/3] Waiting for ES + Kibana to be ready...');
    await waitForScoutReady(repoRoot, log);
    stopTail();
    log.info('[2/3] Scout server ready');
  }

  // --- Step 3: EIS CCM ---
  if (requiresEisCcm) {
    log.info('[3/3] Enabling EIS (Cloud Connected Mode)...');
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

    log.info('[3/3] EIS CCM enabled');
  } else {
    log.info('[3/3] Skipping EIS CCM (no eis- judge/models selected)');
  }
};
