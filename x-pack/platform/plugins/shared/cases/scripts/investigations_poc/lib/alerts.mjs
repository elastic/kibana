// Real detection rule, source events and alert copies for the investigation seeds.
//
// 1. `uipoc-events` holds a few ECS-ish source events.
// 2. One real query rule (`uipoc-seed-rule`) turns them into real alerts in .alerts-security.alerts-default.
// 3. Copies of a real alert (new ids, varied host/user/rule/severity/time) give the volume the scenarios need.
//    Copies are recognised by `kibana.alert.uuid` starting with `uipoc-seed-` so they can be cleaned up.
import { kbn, es, sleep, log } from './client.mjs';

export const EVENTS_INDEX = 'uipoc-events';
export const RULE_ID = 'uipoc-seed-rule';
export const RULE_NAME = 'POC: Suspicious process activity';
export const ALERTS_ALIAS = '.alerts-security.alerts-default';
export const COPY_PREFIX = 'uipoc-seed-';

const EVENT_HOSTS = [
  ['edge-sec-windows-2019-obtc-estec-0', 'SYSTEM', 'cmd.exe', '10.20.4.17', '203.0.113.44'],
  ['edge-sec-windows-2019-obtc-estec-0', 'SYSTEM', 'rundll32.exe', '10.20.4.17', '203.0.113.44'],
  ['edge-sec-build-02', 'svc-build', 'msbuild.exe', '10.20.4.22', '10.20.4.17'],
  ['finance-ws-14', 'a.nguyen', 'powershell.exe', '10.30.2.14', '198.51.100.14'],
  ['pay-db-01', 'svc-breakglass-dba', 'sqlcmd.exe', '10.30.4.52', '10.30.9.5'],
  ['vuln-scan-02', 'svc-scanner', 'nmap.exe', '10.20.9.14', '10.20.1.10'],
];

const ndjson = (lines) => `${lines.map((l) => JSON.stringify(l)).join('\n')}\n`;

const ensureEventsIndex = async () => {
  const exists = (await es('HEAD', `/${EVENTS_INDEX}`, undefined, { okStatuses: [200, 404] })).status === 200;
  if (!exists) {
    await es('PUT', `/${EVENTS_INDEX}`, {
      settings: { number_of_shards: 1, number_of_replicas: 0 },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          message: { type: 'text' },
          event: { properties: { kind: { type: 'keyword' }, category: { type: 'keyword' } } },
          host: { properties: { name: { type: 'keyword' } } },
          user: { properties: { name: { type: 'keyword' } } },
          process: { properties: { name: { type: 'keyword' } } },
          source: { properties: { ip: { type: 'ip' } } },
          destination: { properties: { ip: { type: 'ip' } } },
        },
      },
    });
  }
  const now = Date.now();
  const lines = [];
  EVENT_HOSTS.forEach(([host, user, proc, src, dst], i) => {
    lines.push({ index: { _index: EVENTS_INDEX, _id: `uipoc-evt-${i + 1}` } });
    lines.push({
      '@timestamp': new Date(now - (EVENT_HOSTS.length - i) * 60_000).toISOString(),
      event: { kind: 'event', category: ['process'] },
      host: { name: host },
      user: { name: user },
      process: { name: proc },
      source: { ip: src },
      destination: { ip: dst },
      message: `${proc} started by ${user} on ${host}`,
    });
  });
  await es('POST', '/_bulk?refresh=true', ndjson(lines));
};

const ruleBody = {
  type: 'query',
  name: RULE_NAME,
  description: 'Seed rule for the investigations POC. Turns uipoc-events documents into alerts.',
  rule_id: RULE_ID,
  index: [EVENTS_INDEX],
  query: 'event.kind:event',
  language: 'kuery',
  interval: '1m',
  from: 'now-30d',
  risk_score: 47,
  severity: 'medium',
  enabled: true,
  max_signals: 100,
  tags: ['uipoc-seed'],
};

export const ensureSeedRule = async () => {
  await ensureEventsIndex();
  const found = await kbn('GET', `/api/detection_engine/rules?rule_id=${RULE_ID}`, undefined, { public: true, okStatuses: [200, 404] });
  if (found.status === 200) {
    if (!found.json.enabled) {
      await kbn('PATCH', '/api/detection_engine/rules', { rule_id: RULE_ID, enabled: true }, { public: true });
    }
    return found.json;
  }
  const created = await kbn('POST', '/api/detection_engine/rules', ruleBody, { public: true });
  log(`created detection rule ${RULE_ID} (${created.json.id})`);
  return created.json;
};

const realAlertQuery = {
  size: 1,
  query: { bool: { filter: [{ term: { 'kibana.alert.rule.rule_id': RULE_ID } }], must_not: [{ prefix: { 'kibana.alert.uuid': COPY_PREFIX } }] } },
  sort: [{ '@timestamp': 'asc' }],
};

let template;
const loadTemplate = async ({ timeoutMs = 4 * 60_000 } = {}) => {
  if (template) return template;
  const deadline = Date.now() + timeoutMs;
  let announced = false;
  while (Date.now() < deadline) {
    const res = await es('POST', `/${ALERTS_ALIAS}/_search`, realAlertQuery, { okStatuses: [200, 404] });
    const hit = res.json?.hits?.hits?.[0];
    if (hit) {
      template = { source: hit._source, index: hit._index, id: hit._id };
      return template;
    }
    if (!announced) {
      log('waiting for the seed rule to produce its first alert (up to ~4 minutes)...');
      announced = true;
    }
    await sleep(5000);
  }
  throw new Error(`The seed rule ${RULE_ID} produced no alert within ${timeoutMs / 1000}s. Check the rule status in Security > Rules.`);
};

const get = (obj, dotted) => dotted.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

/** Sets both flattened and nested forms so the document is valid whichever shape the template uses. */
const setField = (doc, dotted, value) => {
  if (dotted in doc) {
    doc[dotted] = value;
    return;
  }
  const parts = dotted.split('.');
  let cursor = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cursor[parts[i]] == null || typeof cursor[parts[i]] !== 'object') {
      // The template stores this branch flattened (e.g. "host.name"), so write the dotted key.
      doc[dotted] = value;
      return;
    }
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
};

const pick = (list, i, fallback) => (list && list.length ? list[i % list.length] : fallback);

const pseudo = (n) => {
  // Deterministic pseudo random in [0, 1).
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const buildDoc = (tpl, spec) => {
  const doc = JSON.parse(JSON.stringify(tpl.source));
  const ts = new Date(spec.timestamp).toISOString();
  setField(doc, '@timestamp', ts);
  setField(doc, 'kibana.alert.uuid', spec.id);
  setField(doc, 'kibana.alert.instance.id', spec.id);
  setField(doc, 'kibana.alert.original_time', ts);
  setField(doc, 'kibana.alert.start', ts);
  setField(doc, 'kibana.alert.last_detected', ts);
  setField(doc, 'kibana.alert.rule.name', spec.rule_name);
  setField(doc, 'kibana.alert.severity', spec.severity);
  setField(doc, 'kibana.alert.risk_score', spec.risk_score);
  setField(doc, 'kibana.alert.reason', spec.reason);
  setField(doc, 'kibana.alert.workflow_status', 'open');
  setField(doc, 'kibana.alert.status', 'active');
  setField(doc, 'kibana.alert.rule.tags', ['uipoc-seed', `uipoc-seed-${spec.scenario}`]);
  if (spec.description) setField(doc, 'kibana.alert.rule.description', spec.description);
  setField(doc, 'host.name', spec.host);
  setField(doc, 'user.name', spec.user);
  if (spec.process) setField(doc, 'process.name', spec.process);
  if (spec.sourceIp) setField(doc, 'source.ip', spec.sourceIp);
  if (spec.destinationIp) setField(doc, 'destination.ip', spec.destinationIp);
  for (const key of ['kibana.alert.case_ids', 'kibana.alert.workflow_user', 'kibana.alert.workflow_reason', 'kibana.alert.workflow_status_updated_at', 'kibana.alert.workflow_tags', 'kibana.alert.workflow_assignee_ids']) {
    delete doc[key];
    const [head, ...rest] = key.split('.');
    if (doc[head] && typeof doc[head] === 'object') {
      let c = doc[head];
      for (let i = 0; i < rest.length - 1; i++) c = c?.[rest[i]];
      if (c) delete c[rest[rest.length - 1]];
    }
  }
  return doc;
};

/**
 * Indexes `count` alert copies and returns descriptors for the investigation alert evidence.
 * `fixed` entries ({ rule_name, severity, risk_score, timestamp, host, user, reason, description, process, sourceIp,
 * destinationIp }) are used first and exactly; the rest are generated from hosts, users and rules across [start, end].
 */
export const ensureAlerts = async ({ scenario, count, hosts, users, rules, start, end, fixed = [] }) => {
  await ensureSeedRule();
  const tpl = await loadTemplate();
  const startMs = Date.parse(start ?? new Date(Date.now() - 6 * 3600_000).toISOString());
  const endMs = Date.parse(end ?? new Date().toISOString());
  const out = [];
  const ops = [];
  for (let i = 0; i < count; i++) {
    const f = fixed[i];
    const rule = pick(rules, i, { name: 'Potential Port Scan Detected', severity: 'medium', risk_score: 47 });
    const host = f?.host ?? pick(hosts, i, 'edge-sec-windows-2019-obtc-estec-0');
    const user = f?.user ?? pick(users, Math.floor(i * 1.7), 'SYSTEM');
    const timestamp = f?.timestamp ?? new Date(startMs + (endMs - startMs) * (count > 1 ? i / (count - 1) : 1) - Math.floor(pseudo(i + 1) * 20_000)).toISOString();
    const spec = {
      scenario,
      id: `${COPY_PREFIX}${scenario.toLowerCase()}-${String(i + 1).padStart(5, '0')}`,
      rule_name: f?.rule_name ?? rule.name,
      severity: f?.severity ?? rule.severity,
      risk_score: f?.risk_score ?? rule.risk_score,
      host,
      user,
      timestamp,
      process: f?.process ?? rule.process,
      sourceIp: f?.sourceIp ?? rule.sourceIp,
      destinationIp: f?.destinationIp ?? pick(rule.destinationIps, i, undefined),
      description: f?.description ?? rule.description,
      reason:
        f?.reason ??
        `${rule.reason ?? 'event'} by ${user} on ${host} created ${f?.severity ?? rule.severity} alert ${f?.rule_name ?? rule.name}.`,
    };
    const doc = buildDoc(tpl, spec);
    ops.push({ index: { _index: tpl.index, _id: spec.id } }, doc);
    out.push({
      id: spec.id,
      index: tpl.index,
      rule_id: RULE_ID,
      rule_name: spec.rule_name,
      severity: spec.severity,
      risk_score: spec.risk_score,
      host,
      user,
      timestamp,
    });
  }
  for (let i = 0; i < ops.length; i += 2000) {
    const res = await es('POST', '/_bulk', ndjson(ops.slice(i, i + 2000)));
    if (res.json?.errors) {
      const bad = res.json.items.find((it) => it.index?.error);
      throw new Error(`Indexing alert copies failed: ${JSON.stringify(bad?.index?.error).slice(0, 600)}`);
    }
  }
  await es('POST', `/${tpl.index}/_refresh`);
  return out;
};

/** Deletes the alert copies of one scenario (or all of them without an argument). */
export const cleanAlerts = async (scenario) => {
  const prefix = scenario ? `${COPY_PREFIX}${scenario.toLowerCase()}-` : COPY_PREFIX;
  const query = { prefix: { 'kibana.alert.uuid': prefix } };
  let deleted = 0;
  // Deleting a case makes the alerts client strip the case id from its alerts in the background; deleting an alert
  // meanwhile hits a version conflict, so retry until none are left.
  for (let attempt = 0; attempt < 30; attempt++) {
    const res = await es('POST', `/${ALERTS_ALIAS}/_delete_by_query?refresh=true&conflicts=proceed`, { query }, { okStatuses: [200, 404] });
    deleted += res.json?.deleted ?? 0;
    const left = await es('POST', `/${ALERTS_ALIAS}/_count`, { query }, { okStatuses: [200, 404] });
    if (!left.json?.count) break;
    await sleep(2000);
  }
  return deleted;
};

/** Removes the seed rule, its real alerts and the source events index (used by `--clean` without a scenario). */
export const cleanSeedRule = async () => {
  await cleanAlerts();
  const found = await kbn('GET', `/api/detection_engine/rules?rule_id=${RULE_ID}`, undefined, { public: true, okStatuses: [200, 404] });
  if (found.status === 200) await kbn('DELETE', `/api/detection_engine/rules?rule_id=${RULE_ID}`, undefined, { public: true });
  await es('POST', `/${ALERTS_ALIAS}/_delete_by_query?refresh=true&conflicts=proceed`, { query: { term: { 'kibana.alert.rule.rule_id': RULE_ID } } }, { okStatuses: [200, 404] });
  await es('DELETE', `/${EVENTS_INDEX}`, undefined, { okStatuses: [200, 404] });
};

export const alertsHelpers = { get, loadTemplate };
