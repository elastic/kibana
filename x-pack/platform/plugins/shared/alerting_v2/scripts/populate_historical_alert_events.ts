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

const BULK_SIZE = 500;
const DEFAULT_ES_URL = 'http://localhost:9200';

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

function generateAlertEvent(opts: {
  ruleId: string;
  ruleVersion: number;
  index: number;
  total: number;
  daysBack: number;
  status: AlertEvent['status'];
  type: AlertEvent['type'];
  source: string;
}): AlertEvent {
  const { ruleId, ruleVersion, index, total, daysBack, status, type, source } = opts;
  const now = Date.now();
  const spreadMs = daysBack * 24 * 60 * 60 * 1000;
  const step = total > 1 ? spreadMs / (total - 1) : 0;
  const ts = new Date(now - (total - 1 - index) * step).toISOString();

  const groupHash = `historical-${ruleId}-${index}-${ts.slice(0, 10)}`;
  const episodeId = `episode-${ruleId}-${index}`;

  return {
    '@timestamp': ts,
    scheduled_timestamp: ts,
    rule: { id: ruleId, version: ruleVersion },
    group_hash: groupHash,
    data: {
      message: `Historical alert event ${index + 1}/${total}`,
      host: `host-${(index % 5) + 1}`,
      count: index + 1,
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

    log.info(
      `Generating ${count} historical alert events for rule ${ruleId} over the last ${daysBack} days into ${ALERT_EVENTS_DATA_STREAM}`
    );

    const events: AlertEvent[] = [];
    for (let i = 0; i < count; i++) {
      events.push(
        generateAlertEvent({
          ruleId,
          ruleVersion,
          index: i,
          total: count,
          daysBack,
          status: status as AlertEvent['status'],
          type: type as AlertEvent['type'],
          source,
        })
      );
    }

    let indexed = 0;
    for (let offset = 0; offset < events.length; offset += BULK_SIZE) {
      const chunk = events.slice(offset, offset + BULK_SIZE);
      const body = chunk.flatMap((doc) => [{ create: { _index: ALERT_EVENTS_DATA_STREAM } }, doc]);
      const resp = await client.bulk({ body, refresh: 'wait_for' });
      if (resp.errors) {
        const firstError = resp.items?.find(
          (item) => item.create?.error ?? item.index?.error
        ) as { create?: { error?: { reason?: string } }; index?: { error?: { reason?: string } } };
        const reason =
          firstError?.create?.error?.reason ?? firstError?.index?.error?.reason ?? 'unknown';
        throw createFailError(`Bulk index error: ${reason}`);
      }
      indexed += chunk.length;
      log.info(`Indexed ${indexed}/${events.length} events`);
    }

    log.success(`Successfully indexed ${indexed} alert events into ${ALERT_EVENTS_DATA_STREAM}`);
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
      ],
      default: {
        count: '100',
        'rule-id': 'historical-rule-1',
        'rule-version': '1',
        'days-back': '7',
        status: 'breached',
        type: 'alert',
        source: 'internal',
      },
      help: `
        --count          Number of alert events to generate (default: 100)
        --rule-id        Rule ID to assign to events (default: historical-rule-1)
        --rule-version   Rule version (default: 1)
        --days-back      Spread event @timestamp over this many days (default: 7)
        --es-url         Elasticsearch URL (default: ELASTICSEARCH_URL or http://localhost:9200)
        --username      Elasticsearch username (or set ELASTIC_USERNAME)
        --password      Elasticsearch password (or set ELASTIC_PASSWORD)
        --status        Event status: breached | recovered | no_data (default: breached)
        --type          Event type: signal | alert (default: alert)
        --source        Event source string (default: internal)
      `,
    },
  }
);
