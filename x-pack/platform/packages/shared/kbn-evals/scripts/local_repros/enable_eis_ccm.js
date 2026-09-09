#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/**
 * Enable Elastic Inference Service (EIS) Cloud Connected Mode (CCM) on a running
 * Elasticsearch cluster (typically the Scout test cluster), then wait for EIS
 * chat completion endpoints to be available.
 *
 * Default behavior reads the ES URL from `.scout/servers/local.json`.
 *
 * Usage:
 *   export KIBANA_EIS_CCM_API_KEY="..."
 *   node x-pack/platform/packages/shared/kbn-evals/scripts/local_repros/enable_eis_ccm.js
 *
 * Options:
 *   --scout-config-path <path>   Path to Scout servers JSON (default: .scout/servers/local.json)
 *   --es-url <url>               Elasticsearch base URL (overrides scout config)
 *   --username <u>               Basic auth username (default: elastic)
 *   --password <p>               Basic auth password (default: changeme)
 *   --retries <n>                Endpoint wait attempts (default: 10)
 *   --delay-ms <n>               Delay between attempts (default: 3000)
 */

const Fs = require('fs');
const Path = require('path');

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next == null || next.startsWith('--')) {
      out[key] = 'true';
      continue;
    }
    out[key] = next;
    i++;
  }
  return out;
}

function normalizeBaseUrl(url) {
  return String(url).replace(/\/+$/, '');
}

function basicAuthHeader(username, password) {
  const token = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

async function fetchJson({ method, url, headers, body }) {
  const res = await fetch(url, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = undefined;
  }

  if (!res.ok) {
    const details = text ? `\n${text}` : '';
    throw new Error(`${method} ${url} failed: HTTP ${res.status}${details}`);
  }

  return parsed;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

function loadEsUrlFromScoutConfig(scoutConfigPath) {
  const abs = Path.resolve(scoutConfigPath);
  if (!Fs.existsSync(abs)) {
    die(
      `Missing Scout servers config: ${abs}\nStart Scout first (node scripts/scout.js start-server ...)`
    );
  }
  const raw = Fs.readFileSync(abs, 'utf8');
  const parsed = JSON.parse(raw);
  const esUrl = parsed && parsed.hosts && parsed.hosts.elasticsearch;
  if (typeof esUrl !== 'string' || !esUrl.trim()) {
    die(`Failed to read hosts.elasticsearch from ${abs}`);
  }
  return esUrl.trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const scoutConfigPath = String(args['scout-config-path'] || '.scout/servers/local.json');
  const username = String(args.username || 'elastic');
  const password = String(args.password || 'changeme');
  const apiKey = String(args['api-key'] || process.env.KIBANA_EIS_CCM_API_KEY || '');
  const retries = Number.parseInt(String(args.retries || '10'), 10);
  const delayMs = Number.parseInt(String(args['delay-ms'] || '3000'), 10);

  if (!apiKey) {
    die('Missing CCM API key. Set KIBANA_EIS_CCM_API_KEY or pass --api-key.');
  }
  if (!Number.isFinite(retries) || retries <= 0) {
    die(`Invalid --retries: ${args.retries}`);
  }
  if (!Number.isFinite(delayMs) || delayMs <= 0) {
    die(`Invalid --delay-ms: ${args['delay-ms']}`);
  }

  const esUrl = normalizeBaseUrl(args['es-url'] || loadEsUrlFromScoutConfig(scoutConfigPath));
  const auth = basicAuthHeader(username, password);
  const headers = {
    authorization: auth,
    'content-type': 'application/json',
  };

  // Wait for the .ccm-inference index shard to be active before attempting
  // the PUT. On a freshly booted ES cluster the index is created lazily and
  // its primary shard may not be assigned yet, causing the PUT to fail with
  // HTTP 500 ("no_shard_available_action_exception") or 503.
  process.stdout.write('Waiting for .ccm-inference index to be ready...\n');
  for (let idxAttempt = 1; idxAttempt <= 30; idxAttempt++) {
    try {
      const idxResp = await fetchJson({
        method: 'GET',
        url: `${esUrl}/_cat/indices/.ccm-inference?h=status`,
        headers: { authorization: auth },
      });
      const idxStatus = String(idxResp).trim();
      if (idxStatus.includes('green') || idxStatus.includes('yellow')) {
        process.stdout.write(`.ccm-inference index ready (status=${idxStatus})\n`);
        break;
      }
    } catch {
      // Index may not exist yet — try creating it explicitly
    }
    if (idxAttempt === 30) {
      process.stdout.write(`.ccm-inference not ready after 30 attempts; trying PUT anyway\n`);
    } else {
      process.stdout.write(`Waiting for .ccm-inference (${idxAttempt}/30)...\n`);
      await sleep(10_000);
    }
  }

  // Enable CCM with retry — the PUT _inference/_ccm can fail with 503 when
  // the .ccm-inference index shard is still initializing even after the
  // index appears in _cat/indices.
  process.stdout.write(`Enabling CCM on ${esUrl}\n`);
  const maxCcmAttempts = 10;
  for (let ccmAttempt = 1; ccmAttempt <= maxCcmAttempts; ccmAttempt++) {
    try {
      await fetchJson({
        method: 'PUT',
        url: `${esUrl}/_inference/_ccm`,
        headers,
        body: { api_key: apiKey },
      });
      process.stdout.write('CCM enabled.\n');
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`CCM attempt ${ccmAttempt}/${maxCcmAttempts} failed: ${msg}\n`);
      if (ccmAttempt === maxCcmAttempts) {
        throw err;
      }
      await sleep(5_000);
    }
  }

  process.stdout.write('Waiting for EIS chat_completion endpoints...\n');
  for (let attempt = 1; attempt <= retries; attempt++) {
    const data = await fetchJson({
      method: 'GET',
      url: `${esUrl}/_inference/_all`,
      headers: { authorization: auth },
    });

    const endpoints = Array.isArray(data && data.endpoints) ? data.endpoints : [];
    const eisChat = endpoints.filter(
      (ep) => ep && ep.task_type === 'chat_completion' && ep.service === 'elastic'
    );

    if (eisChat.length > 0) {
      process.stdout.write(`✅ EIS endpoints available: ${eisChat.length}\n`);
      for (const ep of eisChat.slice(0, 10)) {
        process.stdout.write(`  - ${ep.inference_id}\n`);
      }
      if (eisChat.length > 10) {
        process.stdout.write(`  ... and ${eisChat.length - 10} more\n`);
      }
      return;
    }

    if (attempt === retries) {
      die(`❌ Timed out waiting for EIS endpoints after ${retries} attempts.`);
    }

    process.stdout.write(
      `No endpoints yet (attempt ${attempt}/${retries}), waiting ${delayMs}ms...\n`
    );
    await sleep(delayMs);
  }
}

main().catch((e) => die(e && e.stack ? e.stack : String(e)));
