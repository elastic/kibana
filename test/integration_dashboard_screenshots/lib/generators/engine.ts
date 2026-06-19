/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..', '..');
const INTEGRATIONS_CACHE = path.join(ROOT, '.integrations-cache');
const PACKAGES_DIR = path.join(INTEGRATIONS_CACHE, 'packages');
const SEED_DATA_DIR = path.join(ROOT, '.seed-data');
const SAMPLE_DATA_DIR = path.join(ROOT, 'sample_data');
const CONFIGS_DIR = path.join(__dirname, 'configs');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DataStreamConfig {
  dataset: string;
  indexPattern: string;
  docTarget: number;
  fields: string[];
  filterValues: Record<string, string[]>;
}

export interface PackageConfig {
  package: string;
  dataStreams: DataStreamConfig[];
}

interface FieldDef {
  fullPath: string;
  type: string;
  unit?: string;
}

// ---------------------------------------------------------------------------
// Randomization pools
// ---------------------------------------------------------------------------

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
  'curl/8.4.0',
  'python-requests/2.31.0',
];
const HTTP_METHODS = ['GET', 'GET', 'GET', 'POST', 'POST', 'PUT', 'DELETE', 'HEAD'];
const HTTP_CODES = ['200', '200', '200', '200', '301', '302', '400', '401', '403', '404', '500'];
const URL_PATHS = [
  '/',
  '/index.html',
  '/api/v1/users',
  '/api/v1/health',
  '/login',
  '/dashboard',
  '/api/v1/data',
];
const USERNAMES = ['admin', 'jdoe', 'alice', 'bob', 'svc-deploy', 'root', 'operator'];
const SOURCE_IPS = [
  '10.0.0.15',
  '10.0.0.22',
  '10.0.1.5',
  '172.16.0.50',
  '192.168.1.100',
  '203.0.113.42',
  '198.51.100.7',
];
const OS_NAMES = ['Ubuntu', 'CentOS', 'Debian', 'Red Hat Enterprise Linux', 'Amazon Linux'];
const OS_VERSIONS = ['20.04', '22.04', '8', '9', '11', '12', '7.9'];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const randIp = () => `${randInt(10, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;

// ---------------------------------------------------------------------------
// Dashboard analysis
// ---------------------------------------------------------------------------

const extractFieldsFromKql = (query: string): string[] => {
  if (!query || typeof query !== 'string') return [];
  const fields: string[] = [];
  const pattern = /([a-zA-Z_][a-zA-Z0-9_.]*)\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(query)) !== null) {
    const f = m[1];
    if (f !== 'and' && f !== 'or' && f !== 'not' && !f.startsWith('__')) {
      fields.push(f);
    }
  }
  return fields;
};

const extractFilterFields = (
  filter: any,
  fields: Set<string>,
  filterValues: Record<string, Set<string>>
) => {
  if (!filter || typeof filter !== 'object') return;

  const meta = filter.meta ?? {};
  const query = filter.query ?? filter;

  if (meta.field && meta.field !== '_index') {
    fields.add(meta.field);
  }

  if (query.match_phrase) {
    for (const [k, v] of Object.entries(query.match_phrase)) {
      fields.add(k);
      if (v !== undefined && v !== null) {
        if (!filterValues[k]) filterValues[k] = new Set();
        filterValues[k].add(String(typeof v === 'object' ? (v as any).query ?? v : v));
      }
    }
  }

  if (query.match) {
    for (const [k, v] of Object.entries(query.match)) {
      fields.add(k);
      if (v !== undefined && v !== null) {
        if (!filterValues[k]) filterValues[k] = new Set();
        filterValues[k].add(String(typeof v === 'object' ? (v as any).query ?? v : v));
      }
    }
  }

  if (query.term) {
    for (const [k, v] of Object.entries(query.term)) {
      fields.add(k);
      if (v !== undefined && v !== null) {
        if (!filterValues[k]) filterValues[k] = new Set();
        filterValues[k].add(String(typeof v === 'object' ? (v as any).value ?? v : v));
      }
    }
  }

  if (query.terms) {
    for (const [k, v] of Object.entries(query.terms)) {
      fields.add(k);
      if (Array.isArray(v)) {
        if (!filterValues[k]) filterValues[k] = new Set();
        for (const item of v) filterValues[k].add(String(item));
      }
    }
  }

  if (query.exists?.field) {
    fields.add(query.exists.field);
  }

  if (query.bool) {
    for (const clause of ['must', 'should', 'filter', 'must_not'] as const) {
      const items = query.bool[clause];
      if (Array.isArray(items)) {
        for (const item of items) extractFilterFields({ query: item }, fields, filterValues);
      }
    }
  }

  if (meta.params) {
    if (Array.isArray(meta.params)) {
      for (const p of meta.params) {
        if (meta.key && typeof p === 'string') {
          if (!filterValues[meta.key]) filterValues[meta.key] = new Set();
          filterValues[meta.key].add(p);
        }
      }
    }
  }
};

const extractFieldsFromPanel = (
  panel: any,
  fields: Set<string>,
  filterValues: Record<string, Set<string>>
) => {
  const embeddable = panel.embeddableConfig ?? {};
  const attrs = embeddable.attributes ?? {};
  const state = attrs.state ?? {};

  // Lens form-based columns
  const formBased = state.datasourceStates?.formBased ?? state.datasourceStates?.indexpattern;
  if (formBased?.layers) {
    for (const layer of Object.values(formBased.layers) as any[]) {
      if (!layer?.columns) continue;
      for (const col of Object.values(layer.columns) as any[]) {
        if (col.sourceField && col.sourceField !== '___records___') {
          fields.add(col.sourceField);
        }
        if (col.filter?.query) {
          for (const f of extractFieldsFromKql(col.filter.query)) fields.add(f);
        }
        if (col.params?.field) fields.add(col.params.field);
      }
    }
  }

  // Lens query
  if (state.query?.query) {
    for (const f of extractFieldsFromKql(state.query.query)) fields.add(f);
  }

  // Panel-level filters
  for (const f of state.filters ?? []) {
    if (f.meta?.disabled) continue;
    extractFilterFields(f, fields, filterValues);
  }

  // Saved search columns
  if (attrs.columns && Array.isArray(attrs.columns)) {
    for (const col of attrs.columns) {
      if (typeof col === 'string' && col !== '_source') fields.add(col);
    }
  }

  // Saved search sort
  if (attrs.sort && Array.isArray(attrs.sort)) {
    for (const s of attrs.sort) {
      if (Array.isArray(s) && typeof s[0] === 'string') fields.add(s[0]);
    }
  }

  // Saved search inner searchSource
  const rawInnerSearch = attrs.kibanaSavedObjectMeta?.searchSourceJSON;
  if (rawInnerSearch) {
    let inner: any = {};
    if (typeof rawInnerSearch === 'string') {
      try {
        inner = JSON.parse(rawInnerSearch);
      } catch {
        /* ignore */
      }
    } else if (typeof rawInnerSearch === 'object') {
      inner = rawInnerSearch;
    }
    if (inner.query?.query) {
      for (const f of extractFieldsFromKql(inner.query.query)) fields.add(f);
    }
    for (const fl of inner.filter ?? []) {
      if (fl.meta?.disabled) continue;
      extractFilterFields(fl, fields, filterValues);
    }
  }

  // Map layers
  if (attrs.layerListJSON) {
    let layers: any[] = [];
    if (typeof attrs.layerListJSON === 'string') {
      try {
        layers = JSON.parse(attrs.layerListJSON);
      } catch {
        /* ignore */
      }
    } else if (Array.isArray(attrs.layerListJSON)) {
      layers = attrs.layerListJSON;
    }
    for (const layer of layers) {
      const desc = layer.sourceDescriptor ?? {};
      if (desc.geoField) fields.add(desc.geoField);
      if (desc.metrics) {
        for (const metric of desc.metrics) {
          if (metric.field) fields.add(metric.field);
        }
      }
    }
  }

  // Panel-level embeddableConfig filters
  for (const f of embeddable.filters ?? []) {
    if (f.meta?.disabled) continue;
    extractFilterFields(f, fields, filterValues);
  }

  // TSVB visState (legacy)
  if (embeddable.savedVis?.params?.series) {
    for (const series of embeddable.savedVis.params.series) {
      if (series.metrics) {
        for (const metric of series.metrics) {
          if (metric.field) fields.add(metric.field);
        }
      }
      if (series.terms_field) fields.add(series.terms_field);
      if (series.split_mode === 'terms' && series.terms_field) fields.add(series.terms_field);
    }
  }
};

const resolveDatasetForFields = (
  dashboardDataset: string | null,
  panelDataset: string | null
): string => {
  return panelDataset ?? dashboardDataset ?? '*';
};

const extractPanelDataset = (panel: any): string | null => {
  const embeddable = panel.embeddableConfig ?? {};
  const attrs = embeddable.attributes ?? {};
  const state = attrs.state ?? {};

  for (const f of state.filters ?? []) {
    const q = f.query ?? {};
    if (q.match_phrase?.['data_stream.dataset']) {
      return String(q.match_phrase['data_stream.dataset']);
    }
  }

  if (state.query?.query) {
    const m = state.query.query.match(/data_stream\.dataset\s*:\s*"?([a-zA-Z0-9_.]+)/);
    if (m) return m[1];
  }

  return null;
};

export const analyzePackage = (packageName: string): PackageConfig => {
  const pkgDir = path.join(PACKAGES_DIR, packageName);
  const dashboardDir = path.join(pkgDir, 'kibana', 'dashboard');

  if (!fs.existsSync(dashboardDir)) {
    return { package: packageName, dataStreams: [] };
  }

  const dashboardFiles = fs.readdirSync(dashboardDir).filter((f) => f.endsWith('.json'));
  const dataStreamMap = new Map<
    string,
    { fields: Set<string>; filterValues: Record<string, Set<string>>; indexPattern: string }
  >();

  const ensureDs = (dataset: string, indexPattern: string) => {
    if (!dataStreamMap.has(dataset)) {
      dataStreamMap.set(dataset, { fields: new Set(), filterValues: {}, indexPattern });
    }
    return dataStreamMap.get(dataset)!;
  };

  for (const file of dashboardFiles) {
    let dashboard: any;
    try {
      dashboard = JSON.parse(fs.readFileSync(path.join(dashboardDir, file), 'utf-8'));
    } catch {
      continue;
    }

    const attrs = dashboard.attributes ?? {};

    // Determine dashboard-level dataset from searchSource filters
    let dashboardDataset: string | null = null;
    const dashboardDatasets: string[] = [];
    let dashboardIndexPattern = 'logs-*';

    let searchSource: any = {};
    const rawSearchSource = attrs.kibanaSavedObjectMeta?.searchSourceJSON;
    if (typeof rawSearchSource === 'string') {
      try {
        searchSource = JSON.parse(rawSearchSource);
      } catch {
        /* ignore */
      }
    } else if (rawSearchSource && typeof rawSearchSource === 'object') {
      searchSource = rawSearchSource;
    }

    // Determine index pattern from references
    const refs = dashboard.references ?? [];
    for (const ref of refs) {
      if (ref.type === 'index-pattern' && ref.id) {
        dashboardIndexPattern = ref.id;
        break;
      }
    }

    const dashFields = new Set<string>();
    const dashFilterValues: Record<string, Set<string>> = {};

    for (const f of searchSource.filter ?? []) {
      if (f.meta?.disabled) continue;
      extractFilterFields(f, dashFields, dashFilterValues);

      const q = f.query ?? {};
      if (q.match_phrase?.['data_stream.dataset']) {
        dashboardDataset = String(q.match_phrase['data_stream.dataset']);
        dashboardDatasets.push(dashboardDataset);
      }
      // Handle phrases filter (multiple datasets)
      if (f.meta?.type === 'phrases' && f.meta?.key === 'data_stream.dataset' && f.meta?.params) {
        dashboardDatasets.length = 0;
        for (const p of f.meta.params) {
          dashboardDatasets.push(String(p));
        }
        if (dashboardDatasets.length === 1) {
          dashboardDataset = dashboardDatasets[0];
        }
      }
    }

    if (searchSource.query?.query) {
      for (const f of extractFieldsFromKql(searchSource.query.query)) dashFields.add(f);
    }

    // Controls
    const rawControlPanels = attrs.controlGroupInput?.panelsJSON;
    if (rawControlPanels) {
      let controls: any = {};
      if (typeof rawControlPanels === 'string') {
        try {
          controls = JSON.parse(rawControlPanels);
        } catch {
          /* ignore */
        }
      } else if (typeof rawControlPanels === 'object') {
        controls = rawControlPanels;
      }
      for (const ctrl of Object.values(controls) as any[]) {
        if (ctrl.explicitInput?.fieldName) {
          dashFields.add(ctrl.explicitInput.fieldName);
        }
      }
    }

    // Parse panels
    let panels: any[] = [];
    if (typeof attrs.panelsJSON === 'string') {
      try {
        panels = JSON.parse(attrs.panelsJSON);
      } catch {
        /* ignore */
      }
    } else if (Array.isArray(attrs.panelsJSON)) {
      panels = attrs.panelsJSON;
    }

    for (const panel of panels) {
      const panelFields = new Set<string>();
      const panelFilterValues: Record<string, Set<string>> = {};
      extractFieldsFromPanel(panel, panelFields, panelFilterValues);

      const panelDataset = extractPanelDataset(panel);
      const targetDataset = resolveDatasetForFields(
        dashboardDatasets.length === 1 ? dashboardDatasets[0] : dashboardDataset,
        panelDataset
      );

      if (targetDataset === '*' && dashboardDatasets.length > 0) {
        for (const ds of dashboardDatasets) {
          const entry = ensureDs(ds, dashboardIndexPattern);
          for (const f of panelFields) entry.fields.add(f);
          for (const [k, vs] of Object.entries(panelFilterValues)) {
            if (!entry.filterValues[k]) entry.filterValues[k] = new Set();
            for (const v of vs) entry.filterValues[k].add(v);
          }
        }
      } else if (targetDataset !== '*') {
        const entry = ensureDs(targetDataset, dashboardIndexPattern);
        for (const f of panelFields) entry.fields.add(f);
        for (const [k, vs] of Object.entries(panelFilterValues)) {
          if (!entry.filterValues[k]) entry.filterValues[k] = new Set();
          for (const v of vs) entry.filterValues[k].add(v);
        }
      } else {
        // No dataset info at all - attribute to package wildcard
        const fallbackDs = `${packageName}.*`;
        const entry = ensureDs(fallbackDs, dashboardIndexPattern);
        for (const f of panelFields) entry.fields.add(f);
      }
    }

    // Add dashboard-level fields to all datasets on this dashboard
    if (dashboardDatasets.length > 0) {
      for (const ds of dashboardDatasets) {
        const entry = ensureDs(ds, dashboardIndexPattern);
        for (const f of dashFields) entry.fields.add(f);
        for (const [k, vs] of Object.entries(dashFilterValues)) {
          if (k === 'data_stream.dataset') continue;
          if (!entry.filterValues[k]) entry.filterValues[k] = new Set();
          for (const v of vs) entry.filterValues[k].add(v);
        }
      }
    }
  }

  // Also discover data streams from the package that aren't in any dashboard
  // (they may still need data if referenced by a dataset filter)
  const dataStreamDir = path.join(pkgDir, 'data_stream');
  const knownDatasets = new Set(dataStreamMap.keys());

  // Resolve wildcard entries
  const wildcard = `${packageName}.*`;
  if (dataStreamMap.has(wildcard)) {
    const wildcardEntry = dataStreamMap.get(wildcard)!;
    if (fs.existsSync(dataStreamDir)) {
      for (const ds of fs.readdirSync(dataStreamDir)) {
        const dataset = `${packageName}.${ds}`;
        if (!knownDatasets.has(dataset)) {
          const entry = ensureDs(dataset, wildcardEntry.indexPattern);
          for (const f of wildcardEntry.fields) entry.fields.add(f);
        }
      }
    }
    dataStreamMap.delete(wildcard);
  }

  // Clean up metadata fields that aren't useful for data generation
  const META_FIELDS = new Set(['@timestamp', '___records___', '_source', '_index']);

  const dataStreams: DataStreamConfig[] = [];
  for (const [dataset, entry] of dataStreamMap) {
    const fields = [...entry.fields].filter(
      (f) => !META_FIELDS.has(f) && !f.startsWith('data_stream.')
    );
    if (fields.length === 0) continue;

    const fv: Record<string, string[]> = {};
    for (const [k, vs] of Object.entries(entry.filterValues)) {
      if (k.startsWith('data_stream.')) continue;
      fv[k] = [...vs];
    }

    dataStreams.push({
      dataset,
      indexPattern: entry.indexPattern,
      docTarget: Math.min(1000, Math.max(500, fields.length * 30)),
      fields: fields.sort(),
      filterValues: fv,
    });
  }

  return {
    package: packageName,
    dataStreams: dataStreams.sort((a, b) => a.dataset.localeCompare(b.dataset)),
  };
};

// ---------------------------------------------------------------------------
// Config I/O
// ---------------------------------------------------------------------------

export const writeConfig = (config: PackageConfig): string => {
  fs.mkdirSync(CONFIGS_DIR, { recursive: true });
  const filePath = path.join(CONFIGS_DIR, `${config.package}.json`);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
};

export const readConfig = (packageName: string): PackageConfig | null => {
  const filePath = path.join(CONFIGS_DIR, `${packageName}.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

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

const loadExpectedEvents = (
  packageName: string,
  datasetSuffix: string
): Record<string, unknown>[] => {
  const pipelineDir = path.join(
    PACKAGES_DIR,
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
      /* skip */
    }
  }
  return events;
};

const loadSampleEvent = (packageName: string, datasetSuffix: string): Record<string, unknown>[] => {
  const samplePath = path.join(
    PACKAGES_DIR,
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

const loadBestSource = (
  packageName: string,
  dataset: string
): { events: Record<string, unknown>[]; source: string } => {
  const datasetSuffix = dataset.replace(`${packageName}.`, '');

  let events = loadSeedData(packageName, dataset);
  if (events.length > 0) return { events, source: 'seed-data' };

  events = loadExpectedEvents(packageName, datasetSuffix);
  if (events.length > 0) return { events, source: 'pipeline' };

  events = loadSampleEvent(packageName, datasetSuffix);
  if (events.length > 0) return { events, source: 'sample-event' };

  return { events: [], source: 'none' };
};

// ---------------------------------------------------------------------------
// Field definitions (for synthetic generation)
// ---------------------------------------------------------------------------

const parseFieldsYaml = (packageName: string, datasetSuffix: string): FieldDef[] => {
  const fieldsFile = path.join(
    PACKAGES_DIR,
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
      while (groupStack.length > 0 && groupStack[groupStack.length - 1].indent >= indent)
        groupStack.pop();
      const prefix = groupStack.length > 0 ? groupStack[groupStack.length - 1].prefix + '.' : '';
      groupStack.push({ indent, prefix: prefix + name });
      fields.push({ fullPath: prefix + name, type: 'keyword' });
      continue;
    }
    const typeMatch = line.match(/^\s+type:\s*(.+)/);
    if (typeMatch && fields.length > 0) fields[fields.length - 1].type = typeMatch[1].trim();
    const unitMatch = line.match(/^\s+unit:\s*(.+)/);
    if (unitMatch && fields.length > 0) fields[fields.length - 1].unit = unitMatch[1].trim();
  }
  return fields.filter((f) => f.type !== 'group');
};

// ---------------------------------------------------------------------------
// Synthetic value generation
// ---------------------------------------------------------------------------

const syntheticValue = (fieldPath: string, fieldDefs: FieldDef[], idx: number): unknown => {
  const def = fieldDefs.find((d) => d.fullPath === fieldPath);
  const type = def?.type ?? 'keyword';
  const unit = def?.unit;
  const isBytes =
    unit === 'byte' ||
    fieldPath.includes('.bytes') ||
    fieldPath.endsWith('.total') ||
    fieldPath.endsWith('.free');
  const isPct = unit === 'percent' || fieldPath.includes('.pct');

  switch (type) {
    case 'long':
    case 'integer':
    case 'short':
      if (isBytes) return Math.floor(4e9 + Math.random() * 12e9);
      if (isPct) return Math.round(Math.random() * 10000) / 10000;
      if (fieldPath.includes('.pid')) return randInt(1000, 30000);
      return Math.floor(Math.random() * 100000);
    case 'float':
    case 'double':
    case 'half_float':
    case 'scaled_float':
      if (isPct) return Math.round(Math.random() * 10000) / 10000;
      return Math.round(Math.random() * 1000 * 100) / 100;
    case 'boolean':
      return idx % 2 === 0;
    case 'ip':
      return randIp();
    case 'geo_point':
      return {
        lat: Math.round((Math.random() * 180 - 90) * 10000) / 10000,
        lon: Math.round((Math.random() * 360 - 180) * 10000) / 10000,
      };
    case 'date':
      return new Date(Date.now() - Math.random() * 3600000).toISOString();
    case 'histogram':
      return { counts: [randInt(1, 50), randInt(1, 50), randInt(1, 50)], values: [0.1, 1.0, 10.0] };
    case 'flattened':
    case 'object':
    case 'nested':
      return { key: `synthetic-${idx % 5}` };
    case 'unsigned_long':
      return Math.floor(Math.random() * 100000);
    default:
      if (fieldPath.includes('host.name') || fieldPath.includes('hostname')) return pick(HOSTNAMES);
      if (fieldPath.match(/\.(ip|addr|address)$/) || fieldPath === 'source.ip') return randIp();
      if (fieldPath.includes('user_agent')) return pick(USER_AGENTS);
      if (fieldPath.match(/http\.request\.method/)) return pick(HTTP_METHODS);
      if (fieldPath.match(/http\.response\.status_code/)) return pick(HTTP_CODES);
      if (fieldPath.match(/url\.(path|original)/)) return pick(URL_PATHS);
      if (fieldPath.match(/user\.(name|id)$/) && !fieldPath.includes('agent'))
        return pick(USERNAMES);
      if (fieldPath.match(/source\.(ip|address)/)) return pick(SOURCE_IPS);
      if (fieldPath.match(/os\.name$/)) return pick(OS_NAMES);
      if (fieldPath.match(/os\.version$/)) return pick(OS_VERSIONS);
      if (fieldPath.includes('.type')) return 'synthetic';
      if (fieldPath.includes('.id')) return `id-${randInt(1, 100)}`;
      if (fieldPath.includes('.name')) return `${fieldPath.split('.').slice(-2, -1)[0]}-${idx % 5}`;
      if (fieldPath.includes('message')) return `Sample log message ${idx}`;
      if (fieldPath.includes('level')) return pick(['info', 'warning', 'error', 'debug']);
      return `sample-${fieldPath.split('.').pop()}-${idx % 10}`;
  }
};

// ---------------------------------------------------------------------------
// Nested field helpers
// ---------------------------------------------------------------------------

const setNestedField = (obj: Record<string, unknown>, dotPath: string, value: unknown) => {
  const parts = dotPath.split('.');
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (Array.isArray(current[parts[i]])) {
      // Inject into first array element (or create one)
      if (current[parts[i]].length === 0) current[parts[i]] = [{}];
      current = current[parts[i]][0];
    } else if (!current[parts[i]] || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
      current = current[parts[i]];
    } else {
      current = current[parts[i]];
    }
  }
  current[parts[parts.length - 1]] = value;
};

const getNestedField = (obj: Record<string, unknown>, dotPath: string): unknown => {
  const parts = dotPath.split('.');
  let current: any = obj;
  for (const p of parts) {
    if (!current || typeof current !== 'object') return undefined;
    if (Array.isArray(current)) {
      // Look into first element of array
      current = current[0];
      if (!current || typeof current !== 'object') return undefined;
    }
    current = current[p];
  }
  return current;
};

// ---------------------------------------------------------------------------
// Document variation
// ---------------------------------------------------------------------------

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
        fullPath === 'destination.ip'
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
      } else if (fullPath.match(/user_agent\.(original|name)/)) {
        result[key] = pick(USER_AGENTS);
      } else if (fullPath.match(/http\.request\.method/)) {
        result[key] = pick(HTTP_METHODS);
      } else if (
        fullPath.match(/http\.response\.status_code/) ||
        fullPath.match(/response\.code/)
      ) {
        result[key] = pick(HTTP_CODES);
      } else if (fullPath.match(/url\.(path|original)/)) {
        result[key] = pick(URL_PATHS);
      } else if (fullPath.match(/user\.(name|id)$/) && !fullPath.includes('agent')) {
        result[key] = pick(USERNAMES);
      } else if (fullPath.match(/source\.(ip|address)/)) {
        result[key] = pick(SOURCE_IPS);
      } else if (fullPath.match(/\.port$/)) {
        result[key] = String(randInt(1024, 65535));
      } else if (fullPath.match(/\.pid$/) || fullPath.match(/process\.pid/)) {
        result[key] = String(randInt(100, 32000));
      } else {
        result[key] = value;
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = varyDocument(value as Record<string, unknown>, fullPath);
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

// ---------------------------------------------------------------------------
// Data generation
// ---------------------------------------------------------------------------

export const generatePackage = (
  config: PackageConfig
): { dataset: string; count: number; source: string }[] => {
  const pkgOutputDir = path.join(SAMPLE_DATA_DIR, config.package);
  fs.mkdirSync(pkgOutputDir, { recursive: true });
  const results: { dataset: string; count: number; source: string }[] = [];

  for (const ds of config.dataStreams) {
    const datasetSuffix = ds.dataset.replace(`${config.package}.`, '');
    const fieldDefs = parseFieldsYaml(config.package, datasetSuffix);
    let { events, source } = loadBestSource(config.package, ds.dataset);

    // If no events from any source, generate synthetic
    if (events.length === 0) {
      source = 'synthetic';
      const hostIdx = 0;
      const baseDoc: Record<string, unknown> = {
        agent: { id: `agent-${hostIdx}`, type: 'filebeat', version: '8.18.0' },
        host: {
          name: HOSTNAMES[hostIdx],
          hostname: `${HOSTNAMES[hostIdx]}.local`,
          id: `host-id-${hostIdx}`,
          ip: [SOURCE_IPS[hostIdx % SOURCE_IPS.length]],
          os: { platform: 'linux', name: 'Ubuntu', version: '22.04', family: 'debian' },
        },
        ecs: { version: '8.11.0' },
        event: { module: config.package, dataset: ds.dataset },
      };

      for (const field of ds.fields) {
        if (getNestedField(baseDoc, field) === undefined) {
          setNestedField(baseDoc, field, syntheticValue(field, fieldDefs, 0));
        }
      }
      events = [baseDoc];
    }

    // Inject missing fields into existing events
    for (const event of events) {
      for (const field of ds.fields) {
        if (getNestedField(event as Record<string, unknown>, field) === undefined) {
          setNestedField(
            event as Record<string, unknown>,
            field,
            syntheticValue(field, fieldDefs, 0)
          );
        }
      }
    }

    // Multiply/vary to reach docTarget
    const target = ds.docTarget;
    const multiplied: Record<string, unknown>[] = [];
    for (let i = 0; i < target; i++) {
      const base = events[i % events.length];
      if (i < events.length) {
        multiplied.push(JSON.parse(JSON.stringify(base)));
      } else {
        multiplied.push(varyDocument(JSON.parse(JSON.stringify(base))));
      }
    }

    // Inject filter values - overwrite docs that don't hold any required value
    for (const [field, values] of Object.entries(ds.filterValues)) {
      const requiredSet = new Set(values);
      const missingValues = values.filter(
        (val) => !multiplied.some((e) => String(getNestedField(e, field)) === val)
      );
      if (missingValues.length === 0) continue;

      // Find safe slots (docs whose current value is NOT one of the required values)
      const safeSlots: number[] = [];
      for (let si = 0; si < multiplied.length && safeSlots.length < missingValues.length; si++) {
        const cur = String(getNestedField(multiplied[si], field));
        if (!requiredSet.has(cur)) safeSlots.push(si);
      }

      for (let mi = 0; mi < missingValues.length; mi++) {
        const slot = mi < safeSlots.length ? safeSlots[mi] : mi;
        setNestedField(multiplied[slot], field, missingValues[mi]);
      }
    }

    // Spread fixed timestamps across docs (deterministic 1-hour window)
    const TS_START = new Date('2025-06-15T12:00:00.000Z').getTime();
    const TS_END = new Date('2025-06-15T13:00:00.000Z').getTime();
    const TS_RANGE = TS_END - TS_START;
    for (let di = 0; di < multiplied.length; di++) {
      const fraction = multiplied.length > 1 ? di / (multiplied.length - 1) : 0.5;
      multiplied[di]['@timestamp'] = new Date(TS_START + fraction * TS_RANGE).toISOString();
    }

    const filePath = path.join(pkgOutputDir, `${ds.dataset}.json`);
    fs.writeFileSync(filePath, JSON.stringify(multiplied, null, 2));
    results.push({ dataset: ds.dataset, count: multiplied.length, source });
  }

  return results;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  dataset: string;
  docCount: number;
  totalFields: number;
  presentFields: number;
  missingFields: string[];
  filterIssues: string[];
}

export const validatePackage = (config: PackageConfig): ValidationResult[] => {
  const pkgOutputDir = path.join(SAMPLE_DATA_DIR, config.package);
  const results: ValidationResult[] = [];

  for (const ds of config.dataStreams) {
    const filePath = path.join(pkgOutputDir, `${ds.dataset}.json`);

    if (!fs.existsSync(filePath)) {
      results.push({
        dataset: ds.dataset,
        docCount: 0,
        totalFields: ds.fields.length,
        presentFields: 0,
        missingFields: ds.fields,
        filterIssues: ['File not found'],
      });
      continue;
    }

    const docs: Record<string, unknown>[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const missingFields: string[] = [];

    for (const field of ds.fields) {
      const hasField = docs.some((d) => getNestedField(d, field) !== undefined);
      if (!hasField) missingFields.push(field);
    }

    const filterIssues: string[] = [];
    for (const [field, values] of Object.entries(ds.filterValues)) {
      const docValues = new Set(
        docs.map((d) => String(getNestedField(d, field))).filter((v) => v !== 'undefined')
      );
      for (const v of values) {
        if (!docValues.has(v)) {
          filterIssues.push(`${field}=${v} not found`);
        }
      }
    }

    if (docs.length < 500) {
      filterIssues.push(`Doc count ${docs.length} < 500 minimum`);
    }

    results.push({
      dataset: ds.dataset,
      docCount: docs.length,
      totalFields: ds.fields.length,
      presentFields: ds.fields.length - missingFields.length,
      missingFields,
      filterIssues,
    });
  }

  return results;
};

// ---------------------------------------------------------------------------
// Package discovery
// ---------------------------------------------------------------------------

export const listPackagesWithDashboards = (): string[] => {
  if (!fs.existsSync(PACKAGES_DIR)) return [];
  return fs
    .readdirSync(PACKAGES_DIR)
    .filter((pkg) => {
      const dashDir = path.join(PACKAGES_DIR, pkg, 'kibana', 'dashboard');
      return fs.existsSync(dashDir) && fs.readdirSync(dashDir).some((f) => f.endsWith('.json'));
    })
    .sort();
};

export const hasExistingSampleData = (packageName: string): boolean => {
  const dir = path.join(SAMPLE_DATA_DIR, packageName);
  return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith('.json'));
};
