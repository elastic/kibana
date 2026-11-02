#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * One-command sanity check: builds every pod, then for the two that need no external setup
 * (Notification Center, Connectors) boots the pod, reports /health RSS, runs one real task, and
 * stops it. Requires Elasticsearch at ES_URL (default http://localhost:9200).
 *
 *   node smoke.mjs
 */

import { execFileSync, spawn } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const ES_URL = process.env.ES_URL ?? 'http://localhost:9200';
const ES_USERNAME = process.env.ES_USERNAME ?? 'elastic';
const ES_PASSWORD = process.env.ES_PASSWORD ?? 'changeme';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const waitForReady = (child, timeoutMs = 15000) =>
  new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('timed out waiting for READY')), timeoutMs);
    const onData = (chunk) => {
      buffer += chunk.toString();
      if (/^READY\b/m.test(buffer)) {
        clearTimeout(timer);
        resolve();
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (chunk) => process.stderr.write(`  [pod] ${chunk}`));
  });

const health = async (port) => {
  const res = await fetch(`http://localhost:${port}/health`);
  return res.json();
};

const run = async (port, body) => {
  const res = await fetch(`http://localhost:${port}/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
};

const withPod = async (label, entry, port, exercise) => {
  console.log(`\n=== ${label} ===`);
  const child = spawn('node', [entry], {
    env: { ...process.env, ES_URL, ES_USERNAME, ES_PASSWORD, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await waitForReady(child);
    const before = await health(port);
    console.log(`  READY, rss=${(before.rss / 1024 / 1024).toFixed(1)} MB`);
    await exercise(port);
    const after = await health(port);
    console.log(`  after run, rss=${(after.rss / 1024 / 1024).toFixed(1)} MB`);
  } finally {
    child.kill('SIGKILL');
    await sleep(300);
  }
};

console.log('Building all pods (minified)...');
execFileSync('node', ['build.mjs', '--all', '--minify'], { cwd: here, stdio: 'inherit' });

await withPod('Notification Center: notification-center:cleanup', 'out/pod_notification_center.js', 4101, async (port) => {
  const result = await run(port, {
    taskType: 'notification-center:cleanup',
    taskInstance: { id: 'smoke-nc-1', params: {}, state: {}, attempts: 0 },
    executionUuid: 'smoke-exec-1',
    spaceId: 'default',
    timeoutMs: 30000,
  });
  console.log(`  result: ${JSON.stringify(result)}`);
  if (result.outcome !== 'ok') throw new Error('Notification Center cleanup did not succeed');
});

await withPod('Connectors: server-log', 'out/pod_connectors.js', 4103, async (port) => {
  const result = await run(port, {
    taskType: 'connector:execute',
    taskInstance: {
      id: 'smoke-c-1',
      params: {
        connectorType: 'server-log',
        config: {},
        secrets: {},
        params: { message: 'hello from smoke.mjs', level: 'info' },
      },
      state: {},
      attempts: 0,
    },
    executionUuid: 'smoke-exec-2',
    spaceId: 'default',
    timeoutMs: 30000,
  });
  console.log(`  result: ${JSON.stringify(result)}`);
  if (result.outcome !== 'ok') throw new Error('server-log connector did not succeed');
});

await withPod('Connectors: es_index', 'out/pod_connectors.js', 4103, async (port) => {
  execFileSync('curl', [
    '-s',
    '-X',
    'PUT',
    `${ES_URL}/poc-smoke-index`,
    '-u',
    `${ES_USERNAME}:${ES_PASSWORD}`,
  ]);
  const result = await run(port, {
    taskType: 'connector:execute',
    taskInstance: {
      id: 'smoke-c-2',
      params: {
        connectorType: 'es_index',
        config: { index: 'poc-smoke-index', refresh: true, executionTimeField: null },
        secrets: {},
        params: { documents: [{ hello: 'from smoke.mjs' }], indexOverride: null },
      },
      state: {},
      attempts: 0,
    },
    executionUuid: 'smoke-exec-3',
    spaceId: 'default',
    timeoutMs: 30000,
  });
  console.log(`  result: ${JSON.stringify(result)}`);
  if (result.outcome !== 'ok') throw new Error('es_index connector did not succeed');
  execFileSync('curl', [
    '-s',
    '-X',
    'DELETE',
    `${ES_URL}/poc-smoke-index`,
    '-u',
    `${ES_USERNAME}:${ES_PASSWORD}`,
  ]);
});

console.log('\nAll smoke checks passed.');
