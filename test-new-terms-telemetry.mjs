const C = {
  es: process.env.ES_URL ?? 'http://localhost:9200',
  kibana: process.env.KIBANA_URL ?? 'http://localhost:5601/kbn',
  user: process.env.ES_USERNAME ?? 'elastic',
  pass: process.env.ES_PASSWORD ?? 'changeme',
  index: process.env.INDEX ?? 'telemetry-new-terms-test',
  ruleId: process.env.RULE_ID ?? 'telemetry-new-terms-test-rule',
  fields: (process.env.FIELDS ?? 'host.name,user.name').split(',').map((f) => f.trim()),
  distinct: Number(process.env.DISTINCT ?? 500),
  docsPerCombo: Number(process.env.DOCS_PER_COMBO ?? 2),
  valueLen: Number(process.env.VALUE_LEN ?? 12),
  interval: process.env.INTERVAL ?? '1m',
};

const auth = 'Basic ' + Buffer.from(`${C.user}:${C.pass}`).toString('base64');

async function call(base, path, { method = 'GET', body, xsrf } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: auth, ...(xsrf && { 'kbn-xsrf': 'true' }) },
    body: typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok && res.status !== 404) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}
const es = (p, o) => call(C.es, p, o);
const kbn = (p, o) => call(C.kibana, p, { ...o, xsrf: true });

function nest(fields, leaf) {
  const props = { '@timestamp': { type: 'date' } };
  for (const field of fields) {
    let node = props;
    field.split('.').forEach((part, i, arr) => {
      if (i === arr.length - 1) node[part] = leaf;
      else node = (node[part] ??= { properties: {} }).properties;
    });
  }
  return props;
}
function setPath(obj, field, value) {
  let node = obj;
  field.split('.').forEach((part, i, arr) => {
    if (i === arr.length - 1) node[part] = value;
    else node = node[part] ??= {};
  });
}
function value(fieldIndex, combo, len) {
  const base = `f${fieldIndex}-${String(combo).padStart(6, '0')}-`;
  return base.length >= len ? base.slice(0, len) : base + 'x'.repeat(len - base.length);
}

async function seed() {
  await es(`/${C.index}`, { method: 'DELETE' });
  await es(`/${C.index}`, { method: 'PUT', body: { mappings: { properties: nest(C.fields, { type: 'keyword' }) } } });
  const now = Date.now();
  let lines = [];
  let count = 0;
  for (let combo = 0; combo < C.distinct; combo++) {
    for (let d = 0; d < C.docsPerCombo; d++) {
      const doc = { '@timestamp': new Date(now - Math.floor(Math.random() * 3e5)).toISOString() };
      C.fields.forEach((f, i) => setPath(doc, f, value(i, combo, C.valueLen)));
      lines.push(JSON.stringify({ index: { _index: C.index } }), JSON.stringify(doc));
      count++;
      if (lines.length >= 2000) {
        await es(`/_bulk`, { method: 'POST', body: lines.join('\n') + '\n' });
        lines = [];
      }
    }
  }
  if (lines.length) await es(`/_bulk`, { method: 'POST', body: lines.join('\n') + '\n' });
  await es(`/${C.index}/_refresh`, { method: 'POST' });
  console.log(`Indexed ${count} docs, ${C.distinct} distinct combinations of [${C.fields.join(', ')}].`);
}

async function createRule() {
  await kbn(`/api/detection_engine/rules?rule_id=${C.ruleId}`, { method: 'DELETE' });
  return kbn(`/api/detection_engine/rules`, {
    method: 'POST',
    body: {
      rule_id: C.ruleId,
      type: 'new_terms',
      name: 'New Terms field cardinality telemetry test',
      description: 'Generates the new_terms_field_cardinality_on_rule_execution EBT event.',
      severity: 'low',
      risk_score: 21,
      enabled: true,
      index: [C.index],
      query: '*',
      language: 'kuery',
      new_terms_fields: C.fields,
      history_window_start: 'now-7d',
      from: 'now-360s',
      interval: C.interval,
      max_signals: process.env.MAX_SIGNALS ? Number(process.env.MAX_SIGNALS) : Math.max(C.distinct * 2, 1000),
    },
  });
}

async function waitForRun(after) {
  const deadline = Date.now() + 18e4;
  while (Date.now() < deadline) {
    const rule = await kbn(`/api/detection_engine/rules?rule_id=${C.ruleId}`);
    const last = rule?.execution_summary?.last_execution;
    if (last?.date && new Date(last.date).getTime() >= after) return last;
    await new Promise((r) => setTimeout(r, 5000));
  }
  return null;
}

async function main() {
  await seed();
  const after = Date.now();
  const rule = await createRule();
  console.log(`Rule ${rule.rule_id} created (id=${rule.id}), waiting for execution...`);
  const last = await waitForRun(after);
  console.log(last ? `Executed: ${last.status} ${last.message ?? ''}` : 'No execution within timeout; check Kibana logs.');
  const combineLen = C.fields.length * C.valueLen;
  console.log('Expected EBT payload:', {
    isElasticRule: false,
    newTermsFieldsCount: C.fields.length,
    distinctFieldCombinations: C.distinct,
    maxCombinationValueLength: combineLen,
    avgCombinationValueLength: combineLen,
    completedFullScan: true,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
