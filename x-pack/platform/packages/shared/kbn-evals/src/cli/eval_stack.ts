/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Https from 'https';
import Path from 'path';
import { spawn } from 'child_process';
import type { ToolingLog } from '@kbn/tooling-log';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { resolveCcmApiKey } from '@kbn/es';
import { scoutEvalsArgs } from './prompts';
import { DEFAULT_SCOUT_TARGET, formatScoutTarget, type ScoutTarget } from './scout_target';
import { assertServerlessPortsFree } from './scout_ports';
import {
  isAlive,
  isServiceRunning,
  isScoutStale,
  isEdotStale,
  startService,
  stopService,
  connectorsHash,
  scoutEnvHash,
  edotEnvHash,
  tailLog,
  isEdotDockerRunning,
} from './services';
import { probeHttp } from './profiles';

const SCOUT_LOCAL_CONFIG = '.scout/servers/local.json';
const SCOUT_READY_POLL_INTERVAL_MS = 3000;
const SCOUT_READY_TIMEOUT_MS = 180_000;
// Serverless starts three ES containers (and may pull the image) before Kibana boots.
const SERVERLESS_SCOUT_READY_TIMEOUT_MS = 600_000;
const PROBE_TIMEOUT_MS = 2000;

/**
 * Probes the Scout ES. Serverless ES serves https with the dev CA, which `fetch` does not trust,
 * so https URLs are probed with that CA. Any HTTP response (including 401) counts as reachable.
 */
const probeScoutEs = async (esUrl: string): Promise<boolean> => {
  if (!esUrl.startsWith('https:')) {
    return probeHttp(esUrl);
  }
  return new Promise((resolve) => {
    const request = Https.get(
      esUrl,
      { ca: Fs.readFileSync(CA_CERT_PATH), timeout: PROBE_TIMEOUT_MS },
      (response) => {
        response.resume();
        resolve(true);
      }
    );
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve(false));
  });
};

const waitForScoutReady = async (
  repoRoot: string,
  log: ToolingLog,
  scoutPid: number,
  timeoutMs: number
): Promise<void> => {
  const configPath = Path.join(repoRoot, SCOUT_LOCAL_CONFIG);
  const startTime = Date.now();
  let esUrl: string | undefined;
  let kbnUrl: string | undefined;

  while (Date.now() - startTime < timeoutMs) {
    // A config set that throws exits Scout immediately; its error
    // is already streamed above by tailLog, so fail now rather than after the full timeout.
    if (!isAlive(scoutPid)) {
      throw new Error(
        `Scout exited before becoming ready. See the log above or: node scripts/evals logs --service scout`
      );
    }

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
        probeScoutEs(esUrl),
        probeHttp(`${kbnUrl}/api/status`),
      ]);
      if (esOk && kbnOk) {
        return;
      }
    }

    await new Promise((r) => setTimeout(r, SCOUT_READY_POLL_INTERVAL_MS));
  }

  throw new Error(`Scout did not become ready within ${timeoutMs / 1000}s`);
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

    const [esOk, kbnOk] = await Promise.all([
      probeScoutEs(esUrl),
      probeHttp(`${kbnUrl}/api/status`),
    ]);

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

export interface EnsureEdotOptions {
  repoRoot: string;
  log: ToolingLog;
  elasticsearchHost: string | undefined;
}

/**
 * Ensures the EDOT collector is running (exports traces to the configured ES),
 * reusing an existing instance unless it points at a different Elasticsearch.
 */
export const ensureEdot = async ({
  repoRoot,
  log,
  elasticsearchHost,
}: EnsureEdotOptions): Promise<void> => {
  const staleCheck = isEdotStale(repoRoot, elasticsearchHost);

  if (staleCheck.stale) {
    log.warning(`[edot] EDOT collector is stale (${staleCheck.reason}). Restarting...`);
    await stopService(repoRoot, 'edot', log);
  } else if (isServiceRunning(repoRoot, 'edot') || isEdotDockerRunning()) {
    log.info('[edot] EDOT collector already running -- reusing');
    return;
  }

  log.info('[edot] Starting EDOT collector (backgrounded)...');

  if (elasticsearchHost) {
    log.info(`[edot] EDOT collector will export to: ${elasticsearchHost}`);
  }
  startService(repoRoot, 'edot', 'node', ['scripts/edot_collector.js'], log, {
    envHash: edotEnvHash(elasticsearchHost),
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
    log.info('[edot] EDOT collector started');
  }
};

export interface EnsureScoutOptions {
  repoRoot: string;
  log: ToolingLog;
  gcsCredentials: string | undefined;
  tracingExporters: string | undefined;
  /** Env from the suite's `scoutHook`, forwarded to Scout (see `runScoutHook`). */
  suiteScoutEnv?: Record<string, string>;
  serverConfigSet?: string;
  scoutTarget?: ScoutTarget;
}

/**
 * Ensures the Scout server (ES + Kibana) is running and reachable, restarting it
 * when the existing instance is stale or unhealthy.
 */
export const ensureScout = async ({
  repoRoot,
  log,
  gcsCredentials,
  tracingExporters,
  suiteScoutEnv,
  serverConfigSet = 'evals_tracing',
  scoutTarget = DEFAULT_SCOUT_TARGET,
}: EnsureScoutOptions): Promise<void> => {
  const scoutEnv: Record<string, string> = { ...suiteScoutEnv };
  if (gcsCredentials) {
    scoutEnv.GCS_CREDENTIALS = gcsCredentials;
  }
  if (tracingExporters) {
    scoutEnv.TRACING_EXPORTERS = tracingExporters;
  }

  const scoutAlive = isServiceRunning(repoRoot, 'scout');
  const staleCheck = scoutAlive
    ? isScoutStale(repoRoot, serverConfigSet, scoutEnv, scoutTarget)
    : { stale: false };

  if (staleCheck.stale) {
    log.warning(`[scout] Scout server is stale (${staleCheck.reason}). Restarting...`);
    await stopService(repoRoot, 'scout', log);
  }

  let scoutReusable = scoutAlive && !staleCheck.stale;

  if (scoutReusable) {
    const health = await probeScoutHealth(repoRoot);
    if (!health.ok) {
      log.warning(`[scout] Scout PID alive but ${health.reason}. Restarting...`);
      await stopService(repoRoot, 'scout', log);
      scoutReusable = false;
    }
  }

  if (scoutReusable) {
    log.info('[scout] Scout server already running -- reusing');
    return;
  }

  if (scoutTarget.arch === 'serverless') {
    await assertServerlessPortsFree();
  }

  const scoutConfigPath = Path.join(repoRoot, SCOUT_LOCAL_CONFIG);
  if (Fs.existsSync(scoutConfigPath)) {
    Fs.unlinkSync(scoutConfigPath);
  }

  log.info(
    `[scout] Starting Scout server (backgrounded, ${formatScoutTarget(
      scoutTarget
    )}, ${serverConfigSet})...`
  );

  const scoutPid = startService(
    repoRoot,
    'scout',
    'node',
    ['scripts/scout.js', ...scoutEvalsArgs(serverConfigSet, scoutTarget)],
    log,
    {
      connectorsHash: connectorsHash(),
      serverConfigSet,
      scoutTarget,
      envHash: scoutEnvHash(scoutEnv),
      env: Object.keys(scoutEnv).length > 0 ? scoutEnv : undefined,
    }
  );

  const stopTail = tailLog(repoRoot, 'scout', log, { fromStart: true });
  log.info('[scout] Waiting for ES + Kibana to be ready...');
  try {
    await waitForScoutReady(
      repoRoot,
      log,
      scoutPid,
      scoutTarget.arch === 'serverless' ? SERVERLESS_SCOUT_READY_TIMEOUT_MS : SCOUT_READY_TIMEOUT_MS
    );
  } finally {
    stopTail();
  }
  log.info('[scout] Scout server ready');
};

export interface EnsureEisCcmOptions {
  repoRoot: string;
  log: ToolingLog;
  scoutTarget?: ScoutTarget;
}

/**
 * Enables EIS (Cloud Connected Mode).
 */
export const ensureEisCcm = async ({
  repoRoot,
  log,
  scoutTarget = DEFAULT_SCOUT_TARGET,
}: EnsureEisCcmOptions): Promise<void> => {
  log.info('[eis-ccm] Enabling EIS (Cloud Connected Mode)...');
  const ccmApiKey = await resolveCcmApiKey(log);

  const ccmResult = spawn(
    'node',
    ['x-pack/platform/packages/shared/kbn-evals/scripts/local_repros/enable_eis_ccm.js'],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        KIBANA_EIS_CCM_API_KEY: ccmApiKey,
        // Serverless Scout ES serves https with the dev CA.
        ...(scoutTarget.arch === 'serverless' ? { NODE_EXTRA_CA_CERTS: CA_CERT_PATH } : {}),
      },
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

  log.info('[eis-ccm] EIS CCM enabled');
};

export interface EnsureEvalStackOptions {
  repoRoot: string;
  log: ToolingLog;
  profileEnvOverrides: Record<string, string>;
  suiteScoutEnv?: Record<string, string>;
  serverConfigSet?: string;
  scoutTarget?: ScoutTarget;
  requiresEisCcm: boolean;
}

/**
 * Boots EDOT collector, Scout server, and EIS CCM as background daemons by
 * composing the individual `ensure*` steps.
 */
export const ensureEvalStack = async ({
  repoRoot,
  log,
  profileEnvOverrides,
  suiteScoutEnv,
  serverConfigSet = 'evals_tracing',
  scoutTarget,
  requiresEisCcm,
}: EnsureEvalStackOptions): Promise<void> => {
  await ensureEdot({ repoRoot, log, elasticsearchHost: profileEnvOverrides.TRACING_ES_URL });

  await ensureScout({
    repoRoot,
    log,
    gcsCredentials: profileEnvOverrides.GCS_CREDENTIALS,
    tracingExporters: profileEnvOverrides.TRACING_EXPORTERS,
    suiteScoutEnv,
    serverConfigSet,
    scoutTarget,
  });

  if (requiresEisCcm) {
    await ensureEisCcm({ repoRoot, log, scoutTarget });
  } else {
    log.info('[eis-ccm] Skipping EIS CCM (no eis- judge/models selected)');
  }
};
