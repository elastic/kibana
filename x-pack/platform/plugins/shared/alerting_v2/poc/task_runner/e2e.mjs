#!/usr/bin/env node
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Helpers for exercising the Alerting v2 pod end to end. ES at localhost:9200, Kibana at
 * localhost:5601, elastic/changeme.
 *
 *   node e2e.mjs seed
 *   node e2e.mjs drop-host <host>
 *   node e2e.mjs create-rule                                -> prints rule id
 *   node e2e.mjs get-rule <ruleId> <out.json>
 *   node e2e.mjs run-rule <ruleId>                           -> runs the rule through real Kibana (comparison baseline)
 *   node e2e.mjs capture <ruleId> <out.json>
 *   node e2e.mjs delete-events <ruleId> <scheduled_timestamp>
 *   node e2e.mjs api-key <out.txt>
 *   node e2e.mjs run-body <ruleId> <apiKey.txt>              -> prints a pod /run request body on stdout
 *   node e2e.mjs diff <kibana.json> <runner.json> [--at <scheduled_timestamp>]
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const ES = 'http://localhost:9200';
const KBN = 'http://localhost:5601';
const AUTH = `Basic ${Buffer.from('elastic:changeme').toString('base64')}`;
const DATA_INDEX = 'poc-data';
const EVENTS = '.rule-events';

const call = async (base, method, path, body, extraHeaders = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      authorization: AUTH,
      'content-type': typeof body === 'string' ? 'application/x-ndjson' : 'application/json',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return json;
};
const es = (method, path, body) => call(ES, method, path, body);
const kbn = (method, path, body) =>
  call(KBN, method, path, body, { 'kbn-xsrf': 'poc', 'elastic-api-version': '2023-10-31' });

const [cmd, ...args] = process.argv.slice(2);

const commands = {
  async seed() {
    await es('DELETE', `/${DATA_INDEX}?ignore_unavailable=true`);
    await es('PUT', `/${DATA_INDEX}`, {
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          host: { properties: { name: { type: 'keyword' } } },
          value: { type: 'long' },
        },
      },
    });
    const ts = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const docs = [
      ['a', 15],
      ['b', 12],
      ['c', 5],
    ];
    const bulk = docs
      .map(([name, value]) => `{"index":{}}\n${JSON.stringify({ '@timestamp': ts, host: { name }, value })}\n`)
      .join('');
    await es('POST', `/${DATA_INDEX}/_bulk?refresh=true`, bulk);
    console.log(`seeded ${docs.length} docs at ${ts}`);
  },

  async 'drop-host'(host) {
    const res = await es('POST', `/${DATA_INDEX}/_delete_by_query?refresh=true`, {
      query: { term: { 'host.name': host } },
    });
    console.log(`deleted ${res.deleted} docs for host ${host}`);
  },

  async 'create-rule'() {
    const rule = await kbn('POST', '/api/alerting/v2/rules', {
      kind: 'alert',
      metadata: { name: 'poc-task-runner', tags: ['poc'] },
      schedule: { every: '1h', lookback: '1h' },
      time_field: '@timestamp',
      query: {
        base: `FROM ${DATA_INDEX} | STATS max_val = MAX(value) BY host.name`,
        breach: { segment: 'WHERE max_val >= 10' },
      },
      grouping: { fields: ['host.name'] },
      recovery: { strategy: 'no_breach' },
      no_data: { strategy: 'ignore' },
      state_transition: { pending: { count: 0 }, recovering: { count: 0 } },
    });
    console.log(rule.id);
  },

  async 'get-rule'(ruleId, out) {
    const rule = await kbn('GET', `/api/alerting/v2/rules/${ruleId}`);
    writeFileSync(out, JSON.stringify(rule, null, 2));
    console.log(`wrote ${out}`);
  },

  async 'run-rule'(ruleId) {
    const res = await kbn('POST', `/api/alerting/v2/rules/${ruleId}/_run`);
    console.log(JSON.stringify(res ?? {}));
  },

  async capture(ruleId, out) {
    await es('POST', `/${EVENTS}/_refresh`);
    const res = await es('POST', `/${EVENTS}/_search`, {
      size: 1000,
      query: { term: { 'rule.id': ruleId } },
      sort: [{ '@timestamp': 'asc' }],
    });
    const docs = res.hits.hits.map((h) => h._source);
    writeFileSync(out, JSON.stringify(docs, null, 2));
    const byTs = {};
    for (const d of docs) byTs[d.scheduled_timestamp] = (byTs[d.scheduled_timestamp] ?? 0) + 1;
    console.log(`captured ${docs.length} docs to ${out}`, byTs);
  },

  async 'delete-events'(ruleId, ts) {
    const res = await es('POST', `/${EVENTS}/_delete_by_query?refresh=true`, {
      query: {
        bool: { filter: [{ term: { 'rule.id': ruleId } }, { term: { scheduled_timestamp: ts } }] },
      },
    });
    console.log(`deleted ${res.deleted} events for ${ruleId} at ${ts}`);
  },

  async 'api-key'(out) {
    const res = await es('POST', '/_security/api_key', {
      name: 'poc-task-runner-rule-key',
      role_descriptors: {
        poc_rule: {
          indices: [{ names: [DATA_INDEX], privileges: ['read', 'view_index_metadata'] }],
        },
      },
    });
    writeFileSync(out, res.encoded);
    console.log(`api key ${res.id} written to ${out}`);
  },

  async 'run-body'(ruleId, apiKeyPath) {
    const body = {
      taskType: 'alerting_v2:rule_executor',
      taskInstance: {
        id: ruleId,
        params: { ruleId, spaceId: 'default' },
        state: {},
        attempts: 0,
        scheduledAt: new Date().toISOString(),
      },
      executionUuid: randomUUID(),
      apiKey: readFileSync(apiKeyPath, 'utf8').trim(),
      spaceId: 'default',
      timeoutMs: 30000,
    };
    console.log(JSON.stringify(body));
  },

  async diff(aPath, bPath, ...rest) {
    const at = rest.includes('--at') ? rest[rest.indexOf('--at') + 1] : undefined;
    const IGNORE = new Set(['@timestamp', 'execution.uuid', 'event.ingested']);
    const flatten = (obj, prefix = '', acc = {}) => {
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, acc);
        else acc[key] = v;
      }
      return acc;
    };
    const load = (p) =>
      JSON.parse(readFileSync(p, 'utf8'))
        .filter((d) => !at || d.scheduled_timestamp === at)
        .map((d) => flatten(d));
    const a = load(aPath);
    const b = load(bPath);
    const keyOf = (d) => `${d.group_hash}|${d.status}`;
    const index = (docs) => new Map(docs.map((d) => [keyOf(d), d]));
    const ai = index(a);
    const bi = index(b);
    console.log(`kibana: ${a.length} docs, runner: ${b.length} docs`);
    const keys = new Set([...ai.keys(), ...bi.keys()]);
    let diffs = 0;
    for (const k of keys) {
      const da = ai.get(k);
      const db = bi.get(k);
      if (!da || !db) {
        console.log(`  only in ${da ? 'kibana' : 'runner'}: ${k}`);
        diffs++;
        continue;
      }
      for (const f of new Set([...Object.keys(da), ...Object.keys(db)])) {
        if (IGNORE.has(f)) continue;
        if (JSON.stringify(da[f]) !== JSON.stringify(db[f])) {
          console.log(`  ${k} field ${f}: kibana=${JSON.stringify(da[f])} runner=${JSON.stringify(db[f])}`);
          diffs++;
        }
      }
    }
    console.log(diffs === 0 ? 'IDENTICAL (ignoring @timestamp, execution ids)' : `${diffs} difference(s)`);
  },
};

if (!commands[cmd]) {
  console.error(`unknown command ${cmd}`);
  process.exit(2);
}
await commands[cmd](...args);
