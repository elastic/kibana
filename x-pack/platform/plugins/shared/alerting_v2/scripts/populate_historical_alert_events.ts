/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { ALERT_EVENTS_DATA_STREAM } from '../server/resources/alert_events';
import type { AlertEvent } from '../server/resources/alert_events';

const DEFAULT_ES_URL = 'http://localhost:9200';
const PROGRESS_LOG_INTERVAL = 1_000_000;

/**
 * Build exactly numCombos sizes that sum to totalCount, with variation (some combos more, some less).
 * Uses random weights so distribution is uneven.
 */
function buildComboSizesFixed(totalCount: number, numCombos: number): number[] {
  const weights: number[] = [];
  let totalWeight = 0;
  for (let i = 0; i < numCombos; i++) {
    const w = 0.3 + Math.random();
    weights.push(w);
    totalWeight += w;
  }
  const sizes = weights.map((w) => Math.max(1, Math.floor((totalCount * w) / totalWeight)));
  let sum = sizes.reduce((a, b) => a + b, 0);
  let diff = totalCount - sum;
  if (diff > 0) {
    for (let k = 0; k < diff; k++) sizes[k % sizes.length] += 1;
  } else if (diff < 0) {
    let d = -diff;
    for (let k = 0; d > 0; k++) {
      const idx = k % sizes.length;
      if (sizes[idx] > 1) {
        sizes[idx] -= 1;
        d -= 1;
      }
    }
  }
  return sizes;
}

/** Build list of "documents per combo" that sum to totalCount (used when --num-combos is not set). */
function buildComboSizesVariable(
  totalCount: number,
  maxDocsPerCombo: number,
  runIntervalMin: number
): number[] {
  const runsPerDay = Math.floor((24 * 60) / runIntervalMin);
  const maxPerCombo = Math.min(maxDocsPerCombo, Math.max(1, runsPerDay));
  const sizes: number[] = [];
  let sum = 0;
  while (sum < totalCount) {
    const remaining = totalCount - sum;
    const r = Math.random();
    let size: number;
    if (r < 0.4) size = 1;
    else if (r < 0.65) size = 2 + Math.floor(Math.random() * Math.min(5, maxPerCombo - 1));
    else if (r < 0.85) size = 7 + Math.floor(Math.random() * Math.min(18, maxPerCombo - 6));
    else if (r < 0.95) size = 25 + Math.floor(Math.random() * Math.min(48, maxPerCombo - 24));
    else {
      const minLong = Math.min(73, maxPerCombo);
      size = minLong + Math.floor(Math.random() * Math.max(0, maxPerCombo - minLong + 1));
    }
    size = Math.max(1, Math.min(size, remaining, maxPerCombo));
    sizes.push(size);
    sum += size;
  }
  if (sum > totalCount && sizes.length > 0) {
    sizes[sizes.length - 1] -= sum - totalCount;
    if (sizes[sizes.length - 1] < 1) sizes.pop();
  }
  return sizes;
}

/**
 * Normalize Elasticsearch URL from env/flag so it is valid for new URL().
 * Handles empty, host:port, and full URL forms.
 */
function normalizeEsUrl(raw: string | undefined): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return DEFAULT_ES_URL;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  return `http://${s}`;
}

function parseUrl(url: string): { node: string; auth?: { username: string; password: string } } {
  try {
    const parsed = new URL(url);
    const node =
      parsed.origin +
      (parsed.pathname === '/' || parsed.pathname === '' ? '' : parsed.pathname);
    const auth =
      parsed.username || parsed.password
        ? { username: decodeURIComponent(parsed.username), password: decodeURIComponent(parsed.password) }
        : undefined;
    return { node, auth };
  } catch (e) {
    throw createFlagError(`Invalid Elasticsearch URL "${url}": ${e}`);
  }
}

function isLocalhost(node: string): boolean {
  try {
    const u = new URL(node);
    const host = u.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function createEsClient(
  esUrl: string,
  auth?: { username: string; password: string }
): Client {
  const { node } = parseUrl(esUrl);
  const isHttps = node.startsWith('https:');
  return new Client({
    node,
    ...(auth ? { auth } : {}),
    requestTimeout: 60_000,
    ...(isHttps ? { tls: { rejectUnauthorized: false } } : {}),
  });
}

/** One document for a combo: same rule_id, group_hash, episode_id; @timestamp is startTs + runIndex * interval (rule run every N min). */
function generateAlertEventForCombo(opts: {
  ruleId: string;
  ruleVersion: number;
  comboIndex: number;
  runIndexInCombo: number;
  totalRunsInCombo: number;
  timestamp: string;
  status: AlertEvent['status'];
  type: AlertEvent['type'];
  source: string;
}): AlertEvent {
  const { ruleId, ruleVersion, comboIndex, runIndexInCombo, totalRunsInCombo, timestamp, status, type, source } = opts;
  const groupHash = `historical-${ruleId}-combo-${comboIndex}`;
  const episodeId = `episode-${ruleId}-${comboIndex}`;

  return {
    '@timestamp': timestamp,
    scheduled_timestamp: timestamp,
    rule: { id: ruleId, version: ruleVersion },
    group_hash: groupHash,
    data: {
      message: `Alert event run ${runIndexInCombo + 1}/${totalRunsInCombo} for combo ${comboIndex}`,
      host: `host-${(comboIndex % 5) + 1}`,
      count: runIndexInCombo + 1,
    },
    status,
    source,
    type,
    episode: {
      id: episodeId,
      status: status === 'recovered' ? 'recovering' : 'active',
    },
  };
}

/** Generate all documents for one combo: same (rule_id, group_hash, episode_id), timestamps spaced by runIntervalMin. */
function generateDocsForCombo(opts: {
  comboIndex: number;
  numDocs: number;
  ruleId: string;
  ruleVersion: number;
  daysBack: number;
  runIntervalMin: number;
  status: AlertEvent['status'];
  type: AlertEvent['type'];
  source: string;
}): AlertEvent[] {
  const { comboIndex, numDocs, ruleId, ruleVersion, daysBack, runIntervalMin, status, type, source } = opts;
  const now = Date.now();
  const windowMs = daysBack * 24 * 60 * 60 * 1000;
  const intervalMs = runIntervalMin * 60 * 1000;
  const maxStart = now - (numDocs - 1) * intervalMs;
  const minStart = now - windowMs;
  const startMs = minStart + Math.random() * Math.max(0, maxStart - minStart);
  const docs: AlertEvent[] = [];
  for (let j = 0; j < numDocs; j++) {
    const ts = new Date(startMs + j * intervalMs).toISOString();
    docs.push(
      generateAlertEventForCombo({
        ruleId,
        ruleVersion,
        comboIndex,
        runIndexInCombo: j,
        totalRunsInCombo: numDocs,
        timestamp: ts,
        status,
        type,
        source,
      })
    );
  }
  return docs;
}

function buildBulkBody(docs: AlertEvent[]): unknown[] {
  return docs.flatMap((doc) => [
    { create: { _index: ALERT_EVENTS_DATA_STREAM } },
    doc,
  ]);
}

run(
  async ({ log, flags }) => {
    const count = Number(flags.count);
    const ruleId = (flags['rule-id'] as string) ?? 'historical-rule-1';
    const ruleVersion = Number(flags['rule-version']) || 1;
    const daysBack = Number(flags['days-back']) || 7;
    const esUrl = normalizeEsUrl(
      (flags['es-url'] as string) ?? process.env.ELASTICSEARCH_URL
    );
    const username = (flags.username as string) ?? process.env.ELASTIC_USERNAME;
    const password = (flags.password as string) ?? process.env.ELASTIC_PASSWORD;
    const status = (flags.status as string) ?? 'breached';
    const type = (flags.type as string) ?? 'alert';
    const source = (flags.source as string) ?? 'internal';
    const bulkSize = Math.min(
      Math.max(1, Math.floor(Number(flags['bulk-size']) || 10000)),
      50000
    );
    const concurrency = Math.min(
      Math.max(1, Math.floor(Number(flags.concurrency) || 8)),
      64
    );
    const skipRefresh = Boolean(flags['skip-refresh']);
    const runIntervalMin = Math.max(1, Math.floor(Number(flags['run-interval-min']) || 5));
    const maxDocsPerCombo = Math.min(
      10000,
      Math.max(1, Math.floor(Number(flags['max-docs-per-combo']) || 288))
    );
    const numCombosExplicit = flags['num-combos'] !== undefined && flags['num-combos'] !== ''
      ? Math.max(1, Math.floor(Number(flags['num-combos'])))
      : undefined;

    if (count <= 0 || !Number.isInteger(count)) {
      throw createFailError('--count must be a positive integer');
    }
    if (daysBack <= 0) {
      throw createFailError('--days-back must be positive');
    }
    const validStatuses = ['breached', 'recovered', 'no_data'];
    if (!validStatuses.includes(status)) {
      throw createFailError(`--status must be one of: ${validStatuses.join(', ')}`);
    }
    const validTypes = ['signal', 'alert'];
    if (!validTypes.includes(type)) {
      throw createFailError(`--type must be one of: ${validTypes.join(', ')}`);
    }

    const { node, auth: urlAuth } = parseUrl(esUrl);
    let auth: { username: string; password: string } | undefined =
      username && password ? { username, password } : urlAuth;
    if (!auth && isLocalhost(node)) {
      auth = { username: 'elastic', password: 'changeme' };
    }
    const client = createEsClient(esUrl, auth);

    if (numCombosExplicit !== undefined) {
      log.info(
        `Building ${numCombosExplicit.toLocaleString()} combos for ${count.toLocaleString()} docs (run every ${runIntervalMin}min)...`
      );
    } else {
      log.info(
        `Building combo distribution for ${count.toLocaleString()} docs (run every ${runIntervalMin}min, max ${maxDocsPerCombo} docs/combo)...`
      );
    }
    const comboSizes =
      numCombosExplicit !== undefined
        ? buildComboSizesFixed(count, numCombosExplicit)
        : buildComboSizesVariable(count, maxDocsPerCombo, runIntervalMin);
    const numCombos = comboSizes.length;
    log.info(
      `Indexing ${count.toLocaleString()} alert events across ${numCombos.toLocaleString()} combos into ${ALERT_EVENTS_DATA_STREAM} (bulk-size=${bulkSize}, concurrency=${concurrency}, refresh=${skipRefresh ? 'false' : 'wait_for'})`
    );

    const genOpts = {
      ruleId,
      ruleVersion,
      daysBack,
      status: status as AlertEvent['status'],
      type: type as AlertEvent['type'],
      source,
      runIntervalMin,
    };

    let indexed = 0;
    let lastLogAt = 0;
    const startTime = Date.now();
    const buffer: AlertEvent[] = [];

    const flushBuffer = async (): Promise<void> => {
      if (buffer.length === 0) return;
      const body = buildBulkBody(buffer);
      buffer.length = 0;
      const resp = await client.bulk({
        body,
        refresh: skipRefresh ? false : 'wait_for',
        timeout: '120s',
      });
      if (resp.errors) {
        const firstError = resp.items?.find(
          (item) => item.create?.error ?? item.index?.error
        ) as { create?: { error?: { reason?: string } }; index?: { error?: { reason?: string } } };
        const reason =
          firstError?.create?.error?.reason ?? firstError?.index?.error?.reason ?? 'unknown';
        throw createFailError(`Bulk index error: ${reason}`);
      }
    };

    const runBulkForDocs = async (docs: AlertEvent[]): Promise<number> => {
      if (docs.length === 0) return 0;
      const body = buildBulkBody(docs);
      const resp = await client.bulk({
        body,
        refresh: skipRefresh ? false : 'wait_for',
        timeout: '120s',
      });
      if (resp.errors) {
        const firstError = resp.items?.find(
          (item) => item.create?.error ?? item.index?.error
        ) as { create?: { error?: { reason?: string } }; index?: { error?: { reason?: string } } };
        const reason =
          firstError?.create?.error?.reason ?? firstError?.index?.error?.reason ?? 'unknown';
        throw createFailError(`Bulk index error: ${reason}`);
      }
      return docs.length;
    };

    if (concurrency <= 1) {
      for (let comboIndex = 0; comboIndex < numCombos; comboIndex++) {
        const numDocs = comboSizes[comboIndex];
        const docs = generateDocsForCombo({
          ...genOpts,
          comboIndex,
          numDocs,
        });
        for (const doc of docs) {
          buffer.push(doc);
          if (buffer.length >= bulkSize) {
            indexed += buffer.length;
            await flushBuffer();
            if (indexed - lastLogAt >= PROGRESS_LOG_INTERVAL) {
              log.info(`Indexed ${indexed.toLocaleString()}/${count.toLocaleString()} (${((indexed / count) * 100).toFixed(1)}%)`);
              lastLogAt = indexed;
            }
          }
        }
      }
      indexed += buffer.length;
      await flushBuffer();
    } else {
      const targetChunkDocs = Math.max(bulkSize * 4, Math.floor(count / (concurrency * 2)));
      const chunks: { startCombo: number; endCombo: number }[] = [];
      let startCombo = 0;
      let docAcc = 0;
      for (let c = 0; c < numCombos; c++) {
        docAcc += comboSizes[c];
        if (docAcc >= targetChunkDocs || c === numCombos - 1) {
          chunks.push({ startCombo, endCombo: c + 1 });
          startCombo = c + 1;
          docAcc = 0;
        }
      }
      if (startCombo < numCombos) chunks.push({ startCombo, endCombo: numCombos });

      let nextChunk = 0;
      const runNext = async (): Promise<void> => {
        const i = nextChunk++;
        if (i >= chunks.length) return;
        const { startCombo: sc, endCombo: ec } = chunks[i];
        const buffer: AlertEvent[] = [];
        for (let comboIndex = sc; comboIndex < ec; comboIndex++) {
          const numDocs = comboSizes[comboIndex];
          const docs = generateDocsForCombo({ ...genOpts, comboIndex, numDocs });
          for (const doc of docs) {
            buffer.push(doc);
            if (buffer.length >= bulkSize) {
              const toSend = buffer.splice(0, bulkSize);
              const n = await runBulkForDocs(toSend);
              indexed += n;
              if (indexed - lastLogAt >= PROGRESS_LOG_INTERVAL) {
                log.info(`Indexed ${indexed.toLocaleString()}/${count.toLocaleString()} (${((indexed / count) * 100).toFixed(1)}%)`);
                lastLogAt = indexed;
              }
            }
          }
        }
        if (buffer.length > 0) {
          const n = await runBulkForDocs(buffer);
          indexed += n;
          if (indexed - lastLogAt >= PROGRESS_LOG_INTERVAL) {
            log.info(`Indexed ${indexed.toLocaleString()}/${count.toLocaleString()} (${((indexed / count) * 100).toFixed(1)}%)`);
            lastLogAt = indexed;
          }
        }
        await runNext();
      };
      const workers = Array.from({ length: Math.min(concurrency, chunks.length) }, () => runNext());
      await Promise.all(workers);
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = elapsed > 0 ? (indexed / elapsed).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0';
    log.success(
      `Indexed ${indexed.toLocaleString()} alert events into ${ALERT_EVENTS_DATA_STREAM} in ${elapsed.toFixed(1)}s (~${rate} docs/s)`
    );
  },
  {
    description: 'Populate the .alerts-events data stream with historical alert events',
    flags: {
      string: [
        'rule-id',
        'es-url',
        'username',
        'password',
        'status',
        'type',
        'source',
        'count',
        'days-back',
        'rule-version',
        'bulk-size',
        'concurrency',
        'run-interval-min',
        'max-docs-per-combo',
        'num-combos',
      ],
      boolean: ['skip-refresh'],
      default: {
        count: '100',
        'rule-id': 'historical-rule-1',
        'rule-version': '1',
        'days-back': '7',
        status: 'breached',
        type: 'alert',
        source: 'internal',
        'bulk-size': '10000',
        concurrency: '8',
        'run-interval-min': '5',
        'max-docs-per-combo': '288',
      },
      help: `
        --count              Total number of alert event documents (default: 100)
        --num-combos         If set, use exactly this many unique (rule_id, group_hash, episode_id) combos; docs distributed with variation
        --run-interval-min   Rule run interval in minutes; events for same combo spaced by this (default: 5)
        --max-docs-per-combo Max documents per combo when --num-combos is not set (default: 288)
        --bulk-size          Documents per bulk request, 1-50000 (default: 10000)
        --concurrency        Parallel bulk requests in flight, 1-64 (default: 8)
        --skip-refresh       Set refresh=false during bulk for max speed (default: false)
        --rule-id            Rule ID to assign to events (default: historical-rule-1)
        --rule-version       Rule version (default: 1)
        --days-back          Time window for event @timestamp in days (default: 7)
        --es-url             Elasticsearch URL (default: ELASTICSEARCH_URL or http://localhost:9200)
        --username           Elasticsearch username (or set ELASTIC_USERNAME)
        --password           Elasticsearch password (or set ELASTIC_PASSWORD)
        --status             Event status: breached | recovered | no_data (default: breached)
        --type               Event type: signal | alert (default: alert)
        --source             Event source string (default: internal)
      `,
    },
  }
);
