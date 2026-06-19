/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { EsClient } from './kibana_client';
import type { PackageInfo } from './fleet_client';

const INTEGRATIONS_CACHE = path.resolve(__dirname, '..', '.integrations-cache');
const INTEGRATIONS_REPO = 'https://github.com/elastic/integrations.git';
const SAMPLE_DATA_DIR = path.resolve(__dirname, '..', 'sample_data');
const SEED_DATA_DIR = path.resolve(__dirname, '..', '.seed-data');
const SPREAD_HOURS = 1;
const SYNTHETIC_DOC_COUNT = 100;

const ensureIntegrationsRepo = () => {
  if (fs.existsSync(path.join(INTEGRATIONS_CACHE, 'packages'))) {
    console.log(`Using cached integrations repo at ${INTEGRATIONS_CACHE}`);
    return;
  }
  console.log('Cloning elastic/integrations (shallow)...');
  execSync(`git clone --depth 1 ${INTEGRATIONS_REPO} "${INTEGRATIONS_CACHE}"`, {
    stdio: 'inherit',
  });
};

const setNestedField = (obj: Record<string, unknown>, dotPath: string, value: unknown) => {
  const parts = dotPath.split('.');
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
};

const getNestedField = (obj: Record<string, unknown>, dotPath: string): unknown => {
  const parts = dotPath.split('.');
  let current: any = obj;
  for (const p of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[p];
  }
  return current;
};

// --- Data loading ---

const loadExpectedEvents = (
  packageName: string,
  datasetSuffix: string
): Record<string, unknown>[] => {
  const pipelineDir = path.join(
    INTEGRATIONS_CACHE,
    'packages',
    packageName,
    'data_stream',
    datasetSuffix,
    '_dev',
    'test',
    'pipeline'
  );
  if (!fs.existsSync(pipelineDir)) return [];

  const events: Record<string, unknown>[] = [];
  for (const file of fs.readdirSync(pipelineDir)) {
    if (!file.endsWith('-expected.json')) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(pipelineDir, file), 'utf-8'));
      const docs: Record<string, unknown>[] = raw.expected ?? raw;
      if (!Array.isArray(docs)) continue;
      for (const doc of docs) {
        if (doc && typeof doc === 'object') events.push(doc);
      }
    } catch {
      // skip malformed files
    }
  }
  return events;
};

const loadSampleEvent = (packageName: string, datasetSuffix: string): Record<string, unknown>[] => {
  const samplePath = path.join(
    INTEGRATIONS_CACHE,
    'packages',
    packageName,
    'data_stream',
    datasetSuffix,
    'sample_event.json'
  );
  if (!fs.existsSync(samplePath)) return [];
  try {
    const doc = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
    return doc && typeof doc === 'object' ? [doc] : [];
  } catch {
    return [];
  }
};

const loadSeedData = (packageName: string, dataset: string): Record<string, unknown>[] => {
  const seedFile = path.join(SEED_DATA_DIR, packageName, `${dataset}.json`);
  if (!fs.existsSync(seedFile)) return [];
  try {
    const docs = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
    return Array.isArray(docs) ? docs : [];
  } catch {
    return [];
  }
};

const loadSampleData = (packageName: string, dataset: string): Record<string, unknown>[] => {
  const sampleFile = path.join(SAMPLE_DATA_DIR, packageName, `${dataset}.json`);
  if (!fs.existsSync(sampleFile)) return [];
  try {
    const docs = JSON.parse(fs.readFileSync(sampleFile, 'utf-8'));
    return Array.isArray(docs) ? docs : [];
  } catch {
    return [];
  }
};

// --- Realistic randomization pools ---

const HOSTNAMES = [
  'web-prod-01',
  'web-prod-02',
  'web-prod-03',
  'api-server-01',
  'api-server-02',
  'db-primary',
  'db-replica-01',
  'cache-01',
  'worker-01',
  'worker-02',
  'gateway-01',
  'monitor-01',
  'lb-frontend-01',
  'app-staging-01',
  'batch-proc-01',
];
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  'curl/8.4.0',
  'Go-http-client/2.0',
  'python-requests/2.31.0',
];
const HTTP_METHODS = ['GET', 'GET', 'GET', 'GET', 'POST', 'POST', 'PUT', 'DELETE', 'HEAD'];
const HTTP_CODES = [
  '200',
  '200',
  '200',
  '200',
  '200',
  '301',
  '302',
  '304',
  '400',
  '401',
  '403',
  '404',
  '500',
  '502',
  '503',
];
const URL_PATHS = [
  '/',
  '/index.html',
  '/api/v1/users',
  '/api/v1/health',
  '/login',
  '/dashboard',
  '/static/js/main.js',
  '/static/css/app.css',
  '/images/logo.png',
  '/api/v1/data',
  '/api/v1/search?q=test',
  '/docs',
  '/favicon.ico',
  '/robots.txt',
  '/api/v2/metrics',
];
const USERNAMES = [
  'admin',
  'jdoe',
  'alice',
  'bob',
  'svc-deploy',
  'root',
  'nginx',
  'www-data',
  'operator',
];
const SOURCE_IPS = [
  '10.0.0.15',
  '10.0.0.22',
  '10.0.1.5',
  '10.0.2.100',
  '172.16.0.50',
  '192.168.1.100',
  '192.168.1.101',
  '203.0.113.42',
  '198.51.100.7',
  '100.64.0.12',
];
const OS_NAMES = ['Ubuntu', 'CentOS', 'Debian', 'Red Hat Enterprise Linux', 'Amazon Linux'];
const OS_VERSIONS = ['20.04', '22.04', '8', '9', '11', '12', '7.9', '2023'];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const randIp = () => `${randInt(10, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;

// Fields that should NOT be varied (identity/classification fields)
const PRESERVE_FIELDS = new Set([
  'data_stream',
  'ecs',
  'event.module',
  'event.dataset',
  'event.kind',
  'event.category',
  'event.type',
  'event.provider',
  'event.action',
  'event.outcome',
  'event.code',
  'input',
  'tags',
  'service.type',
  'metricset',
  'winlog.provider_name',
  'winlog.channel',
  'winlog.keywords',
  'winlog.opcode',
  'winlog.outcome',
  'winlog.level',
  'log.level',
  'log.syslog',
]);

const shouldPreserve = (fullPath: string): boolean => {
  for (const p of PRESERVE_FIELDS) {
    if (fullPath === p || fullPath.startsWith(p + '.')) return true;
  }
  return false;
};

const varyDocument = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (shouldPreserve(fullPath)) {
      result[key] = value;
      continue;
    }

    if (typeof value === 'number') {
      const isInteger = Number.isInteger(value);
      if (fullPath.includes('.pct') || fullPath.includes('percent')) {
        result[key] = Math.min(1, Math.max(0, value + (Math.random() - 0.5) * 0.4));
      } else if (value === 0) {
        result[key] = Math.random() < 0.3 ? randInt(0, 5) : 0;
      } else {
        const jitter = 0.5 + Math.random();
        const varied = value * jitter;
        result[key] = isInteger ? Math.round(varied) : Math.round(varied * 10000) / 10000;
      }
    } else if (typeof value === 'string') {
      if (
        fullPath.match(/\.(ip|addr|address)$/) ||
        fullPath === 'source.ip' ||
        fullPath === 'destination.ip' ||
        fullPath === 'client.ip'
      ) {
        result[key] = /^\d+\.\d+\.\d+\.\d+$/.test(value) ? randIp() : value;
      } else if (fullPath.match(/host\.(name|hostname)$/)) {
        result[key] = pick(HOSTNAMES);
      } else if (
        fullPath === 'host.id' ||
        fullPath === 'agent.id' ||
        fullPath === 'agent.ephemeral_id'
      ) {
        result[key] = `${value.slice(0, 8)}-${randInt(1000, 9999)}`;
      } else if (
        fullPath.match(/user_agent\.(original|name)/) ||
        fullPath === 'user_agent.original'
      ) {
        result[key] = pick(USER_AGENTS);
      } else if (fullPath.match(/http\.request\.method/)) {
        result[key] = pick(HTTP_METHODS);
      } else if (
        fullPath.match(/http\.response\.status_code/) ||
        fullPath.match(/response\.code/)
      ) {
        result[key] = pick(HTTP_CODES);
      } else if (fullPath.match(/url\.(path|original)/) || fullPath === 'url.path') {
        result[key] = pick(URL_PATHS);
      } else if (fullPath.match(/user\.(name|id)$/) && !fullPath.includes('agent')) {
        result[key] = pick(USERNAMES);
      } else if (fullPath.match(/source\.(ip|address)/)) {
        result[key] = pick(SOURCE_IPS);
      } else if (fullPath.match(/os\.name$/)) {
        result[key] = pick(OS_NAMES);
      } else if (fullPath.match(/os\.version$/)) {
        result[key] = pick(OS_VERSIONS);
      } else if (fullPath.match(/\.port$/)) {
        result[key] = String(randInt(1024, 65535));
      } else if (fullPath.match(/\.pid$/) || fullPath.match(/process\.pid/)) {
        result[key] = String(randInt(100, 32000));
      } else {
        result[key] = value;
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const rec = value as Record<string, unknown>;
      if (key === 'location' && typeof rec.lat === 'number' && typeof rec.lon === 'number') {
        result[key] = {
          lat: Math.max(-90, Math.min(90, rec.lat + (Math.random() - 0.5) * 2)),
          lon: Math.max(-180, Math.min(180, rec.lon + (Math.random() - 0.5) * 2)),
        };
      } else {
        result[key] = varyDocument(rec, fullPath);
      }
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === 'string' && /^\d+\.\d+\.\d+\.\d+$/.test(item)) return randIp();
        return item;
      });
    } else {
      result[key] = value;
    }
  }

  return result;
};


// --- Synthetic doc generation for data streams with no test data ---

interface FieldDef {
  fullPath: string;
  type: string;
  unit?: string;
}

const parseFieldsYaml = (packageName: string, datasetSuffix: string): FieldDef[] => {
  const fieldsFile = path.join(
    INTEGRATIONS_CACHE,
    'packages',
    packageName,
    'data_stream',
    datasetSuffix,
    'fields',
    'fields.yml'
  );
  if (!fs.existsSync(fieldsFile)) return [];

  const content = fs.readFileSync(fieldsFile, 'utf-8');
  const fields: FieldDef[] = [];
  const groupStack: Array<{ indent: number; prefix: string }> = [];

  for (const line of content.split('\n')) {
    const nameMatch = line.match(/^(\s*)- name:\s*(.+)/);
    if (nameMatch) {
      const indent = nameMatch[1].length;
      const name = nameMatch[2].trim().replace(/^["']|["']$/g, '');
      while (groupStack.length > 0 && groupStack[groupStack.length - 1].indent >= indent) {
        groupStack.pop();
      }
      const prefix = groupStack.length > 0 ? groupStack[groupStack.length - 1].prefix + '.' : '';
      groupStack.push({ indent, prefix: prefix + name });
      fields.push({ fullPath: prefix + name, type: 'keyword' });
      continue;
    }

    const typeMatch = line.match(/^\s+type:\s*(.+)/);
    if (typeMatch && fields.length > 0) {
      fields[fields.length - 1].type = typeMatch[1].trim();
    }

    const unitMatch = line.match(/^\s+unit:\s*(.+)/);
    if (unitMatch && fields.length > 0) {
      fields[fields.length - 1].unit = unitMatch[1].trim();
    }
  }

  return fields.filter((f) => f.type !== 'group');
};

const parseBaseFields = (packageName: string, datasetSuffix: string): Record<string, string> => {
  const baseFile = path.join(
    INTEGRATIONS_CACHE,
    'packages',
    packageName,
    'data_stream',
    datasetSuffix,
    'fields',
    'base-fields.yml'
  );
  if (!fs.existsSync(baseFile)) return {};

  const content = fs.readFileSync(baseFile, 'utf-8');
  const constants: Record<string, string> = {};
  let currentName = '';

  for (const line of content.split('\n')) {
    const nameMatch = line.match(/^\s*- name:\s*(.+)/);
    if (nameMatch) {
      currentName = nameMatch[1].trim();
      continue;
    }
    const valueMatch = line.match(/^\s+value:\s*(.+)/);
    if (valueMatch && currentName) {
      constants[currentName] = valueMatch[1].trim();
    }
  }

  return constants;
};

const syntheticValue = (fieldDef: FieldDef, idx: number): unknown => {
  const { type, unit, fullPath } = fieldDef;
  const isBytes =
    unit === 'byte' ||
    fullPath.includes('.bytes') ||
    fullPath.endsWith('.total') ||
    fullPath.endsWith('.free');
  const isPct = unit === 'percent' || fullPath.includes('.pct');

  switch (type) {
    case 'long':
    case 'integer':
    case 'short':
      if (isBytes) return Math.floor(4e9 + Math.random() * 12e9);
      if (fullPath.includes('.cores')) return 4 + Math.floor(Math.random() * 12);
      if (
        fullPath.includes('.packets') ||
        fullPath.includes('.errors') ||
        fullPath.includes('.dropped')
      ) {
        return Math.floor(Math.random() * 1e6);
      }
      if (fullPath.includes('.pid')) return randInt(1000, 30000);
      return Math.floor(Math.random() * 100000);
    case 'float':
    case 'double':
    case 'half_float':
      if (isPct) return Math.round(Math.random() * 10000) / 10000;
      return Math.round(Math.random() * 1000 * 100) / 100;
    case 'scaled_float':
      if (isPct) return Math.round(Math.random() * 10000) / 10000;
      return Math.round(Math.random() * 100 * 100) / 100;
    case 'boolean':
      return idx % 2 === 0;
    case 'ip':
      return randIp();
    case 'geo_point':
      return { lat: Math.round((Math.random() * 180 - 90) * 10000) / 10000, lon: Math.round((Math.random() * 360 - 180) * 10000) / 10000 };
    case 'date':
      return new Date(Date.now() - Math.random() * SPREAD_HOURS * 3600000).toISOString();
    case 'histogram':
      return { counts: [randInt(1, 50), randInt(1, 50), randInt(1, 50)], values: [0.1, 1.0, 10.0] };
    case 'flattened':
    case 'object':
    case 'nested':
      return { key: `synthetic-${idx % 5}` };
    case 'unsigned_long':
      return Math.floor(Math.random() * 100000);
    case 'keyword':
    case 'constant_keyword':
    case 'wildcard':
    case 'text':
    case 'match_only_text':
      if (fullPath.includes('host.name') || fullPath.includes('hostname')) return pick(HOSTNAMES);
      if (fullPath.includes('.type')) return 'synthetic';
      if (fullPath.includes('.id')) return `id-${randInt(1, 100)}`;
      if (fullPath.includes('.name')) return `${fullPath.split('.').slice(-2, -1)[0]}-${idx % 5}`;
      return `sample-${fullPath.split('.').pop()}-${idx}`;
    default:
      return `sample-${fullPath.split('.').pop()}-${idx}`;
  }
};

const generateSyntheticDocs = (
  packageName: string,
  datasetSuffix: string,
  dataset: string,
  count: number
): Record<string, unknown>[] => {
  const fieldDefs = parseFieldsYaml(packageName, datasetSuffix);
  if (fieldDefs.length === 0) return [];

  const baseFields = parseBaseFields(packageName, datasetSuffix);

  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const doc: Record<string, unknown> = {
      agent: {
        id: `agent-${hostIdx}`,
        type: 'metricbeat',
        version: '8.0.0',
        ephemeral_id: `eph-${randInt(1000, 9999)}`,
      },
      host: {
        name: HOSTNAMES[hostIdx],
        hostname: `${HOSTNAMES[hostIdx]}.local`,
        id: `host-id-${hostIdx}`,
        ip: [SOURCE_IPS[hostIdx % SOURCE_IPS.length]],
        mac: ['00:11:22:33:44:55'],
        os: {
          platform: 'linux',
          name: OS_NAMES[hostIdx % OS_NAMES.length],
          version: OS_VERSIONS[hostIdx % OS_VERSIONS.length],
          family: 'debian',
        },
        architecture: 'x86_64',
      },
      ecs: { version: '8.0.0' },
      event: {
        module: baseFields['event.module'] ?? packageName,
        dataset: baseFields['event.dataset'] ?? dataset,
        duration: Math.floor(Math.random() * 1e8),
      },
      service: { type: packageName },
      metricset: { name: datasetSuffix, period: 10000 },
    };

    for (const fieldDef of fieldDefs) {
      setNestedField(doc, fieldDef.fullPath, syntheticValue(fieldDef, i));
    }

    docs.push(doc);
  }

  return docs;
};

// --- Timestamps ---

const spreadTimestamps = (
  events: Record<string, unknown>[],
  hours: number
): Record<string, unknown>[] => {
  const now = Date.now();
  const rangeMs = hours * 60 * 60 * 1000;
  const startMs = now - rangeMs;

  return events.map((event, i) => {
    const fraction = events.length > 1 ? i / (events.length - 1) : 0.5;
    const jitterMs = Math.random() * (rangeMs / Math.max(events.length, 1));
    const ts = new Date(startMs + fraction * rangeMs + jitterMs);
    return { ...event, '@timestamp': ts.toISOString() };
  });
};

// --- Document sanitization ---

const PLACEHOLDER_RE = /^value-\d+$/;

const sanitizeDocument = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'string' && PLACEHOLDER_RE.test(value)) {
      continue;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const rec = value as Record<string, unknown>;
      const isGeoPoint = key === 'location' && 'lat' in rec && 'lon' in rec;
      if (isGeoPoint) {
        const geo = rec as Record<string, number>;
        result[key] = {
          ...geo,
          lat: Math.max(-90, Math.min(90, geo.lat)),
          lon: Math.max(-180, Math.min(180, geo.lon)),
        };
      } else {
        const cleaned = sanitizeDocument(rec, fullPath);
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned;
        }
      }
    } else if (Array.isArray(value)) {
      result[key] = value
        .map((item) => {
          if (typeof item === 'string' && PLACEHOLDER_RE.test(item)) return null;
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            return sanitizeDocument(item as Record<string, unknown>, fullPath);
          }
          return item;
        })
        .filter((item) => item !== null);
    } else {
      result[key] = value;
    }
  }
  return result;
};

// --- Bulk indexing ---

const bulkIndex = async (
  es: EsClient,
  dataStreamName: string,
  events: Record<string, unknown>[],
  filterOverrides: Record<string, string[]>
): Promise<number> => {
  if (events.length === 0) return 0;

  const firstDash = dataStreamName.indexOf('-');
  const lastDash = dataStreamName.lastIndexOf('-');
  const dsType = dataStreamName.slice(0, firstDash);
  const dsDataset = dataStreamName.slice(firstDash + 1, lastDash);
  const dsNamespace = dataStreamName.slice(lastDash + 1);

  const BATCH_SIZE = 500;
  let totalIndexed = 0;

  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const ndjsonBody =
      batch
        .map((event, batchIdx) => {
          let doc = JSON.parse(JSON.stringify(event));
          const docIdx = i + batchIdx;

          delete doc._id;
          delete doc._index;
          delete doc._score;
          delete doc._source;
          delete doc._version;

          doc = sanitizeDocument(doc);

          setNestedField(doc, 'data_stream.type', dsType);
          setNestedField(doc, 'data_stream.dataset', dsDataset);
          setNestedField(doc, 'data_stream.namespace', dsNamespace);

          for (const [field, values] of Object.entries(filterOverrides)) {
            if (values.length > 0 && getNestedField(doc, field) === undefined) {
              setNestedField(doc, field, values[docIdx % values.length]);
            }
          }

          if (!doc['@timestamp']) {
            doc['@timestamp'] = new Date().toISOString();
          }

          return `{"create":{}}\n${JSON.stringify(doc)}`;
        })
        .join('\n') + '\n';

    const res = await es.bulk(`/${dataStreamName}/_bulk?pipeline=_none`, ndjsonBody);

    if (res.status !== 200 && res.status !== 201) {
      console.warn(`  Bulk index error for ${dataStreamName}: ${res.status}`);
      if (res.body?.error) {
        console.warn(`  ${JSON.stringify(res.body.error).slice(0, 200)}`);
      }
      continue;
    }

    if (res.body?.errors) {
      const firstError = res.body.items?.find((item: any) => item.create?.error);
      if (firstError) {
        console.warn(
          `  Partial errors in ${dataStreamName}: ${JSON.stringify(firstError.create.error).slice(
            0,
            200
          )}`
        );
      }
    }

    const successCount = (res.body?.items ?? []).filter((item: any) => !item.create?.error).length;
    totalIndexed += successCount;
  }

  return totalIndexed;
};

// --- Main seeder ---

export const seedDataForPackage = async (
  es: EsClient,
  packageInfo: PackageInfo,
  perStreamOverrides: Record<string, Record<string, string[]>> = {}
): Promise<number> => {
  let totalDocs = 0;

  for (const ds of packageInfo.dataStreams) {
    const dataStreamName = `${ds.type}-${ds.dataset}-default`;
    const datasetSuffix = ds.dataset.replace(`${packageInfo.name}.`, '');

    let events = loadSampleData(packageInfo.name, ds.dataset);
    let source = 'sample_data';
    if (events.length === 0) {
      events = loadSeedData(packageInfo.name, ds.dataset);
      source = 'seed';
    }
    if (events.length === 0) {
      events = loadExpectedEvents(packageInfo.name, datasetSuffix);
      source = 'pipeline';
    }
    if (events.length === 0) {
      events = loadSampleEvent(packageInfo.name, datasetSuffix);
      source = 'sample';
    }
    if (events.length === 0) {
      events = generateSyntheticDocs(
        packageInfo.name,
        datasetSuffix,
        ds.dataset,
        SYNTHETIC_DOC_COUNT
      );
      source = 'synthetic';
    }
    if (events.length === 0) {
      console.log(`  [${ds.dataset}] No test data or field defs found, skipping`);
      continue;
    }

    const spread = spreadTimestamps(events, SPREAD_HOURS);
    const overrides = perStreamOverrides[ds.dataset] ?? {};

    await es.deleteDataStream(dataStreamName);
    const indexed = await bulkIndex(es, dataStreamName, spread, overrides);
    if (indexed > 0) {
      console.log(
        `  [${ds.dataset}] ${indexed} docs (${source}, ${events.length} samples) -> ${dataStreamName}`
      );
      totalDocs += indexed;
    }

    if (indexed === 0 && events.length > 0) {
      console.warn(
        `  [${ds.dataset}] All ${events.length} ${source} docs failed to index into ${dataStreamName}`
      );
    }
  }

  return totalDocs;
};

export const setupPrerequisites = (): boolean => {
  ensureIntegrationsRepo();
  return true;
};

export const cleanupCorpora = () => {
  // Nothing to clean up - we read directly from the integrations repo
};
