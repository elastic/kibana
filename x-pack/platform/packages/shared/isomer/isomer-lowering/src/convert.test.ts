/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { vegaSchema } from '@kbn/isomer-primitives-vega';

import { convertDashboard } from './convert';
import { readPinnedControls } from './dashboard_context';
import { parseSavedObjectNdjson } from './kibana/from-saved-object/ndjson';
import { selectedAttributes } from './kibana/from-saved-object/dashboard/panels/saved_search';
import { corpusObjects } from './corpus.test_helpers';
import type { EsqlResponse } from './esql_response';

const ndjson = readFileSync(join(__dirname, '../fixtures/web_logs_sample.ndjson'), 'utf8');
const LOGS = 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b';

// Every column the query names, one row of 1s: enough for each binder to build its node.
const executeEsql = async (esql: string): Promise<EsqlResponse> => {
  const names = [...esql.matchAll(/(?:^|[,|]\s*|BY\s+|STATS\s+)`?([A-Za-z_@][\w.@]*)`?\s*=/gm)].map(
    ([, name]) => name
  );
  return {
    columns: names.map((name) => ({ name, type: 'long' })),
    values: [names.map(() => 1)],
  };
};

const panelCount = (): number => {
  const dashboard = ndjson
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
    .find(({ type, id }) => type === 'dashboard' && id === LOGS);
  return JSON.parse(dashboard.attributes.panelsJSON).length;
};

describe('convertDashboard', () => {
  it('returns every panel in order with its grid box, binding Markdown and tables', async () => {
    const converted = await convertDashboard({
      ndjson,
      dashboardId: LOGS,
      now: Date.parse('2026-10-20T00:00:00Z'),
      executeEsql,
      search: async () => ({ hits: { hits: [] }, aggregations: {} }),
    });
    expect(converted.title).toBe('[Logs] Web Traffic');
    expect(converted.panels).toHaveLength(panelCount());
    for (const panel of converted.panels) {
      expect(panel.grid).toEqual({
        x: expect.any(Number),
        y: expect.any(Number),
        w: expect.any(Number),
        h: expect.any(Number),
      });
      if (panel.node) {
        expect(panel.outcome.status).toBe('converted');
        expect(panel.node.id).toBe(panel.panelId);
      }
    }
    const kinds = converted.panels.map(({ kind, outcome }) => `${kind}:${outcome.status}`);
    expect(kinds).toContain('markdown:converted');
    expect(converted.panels.find(({ kind }) => kind === 'markdown')?.node).toMatchObject({
      type: 'markdown',
      text: expect.stringContaining(''),
    });
  });
});

describe('convertDashboard with controls', () => {
  it('sends the on-screen control selection with every query, and Vega searches, as Kibana does', async () => {
    const dashboard = parseSavedObjectNdjson(ndjson).find(
      ({ type, id }) => type === 'dashboard' && id === LOGS
    )!;
    const [optionsList] = readPinnedControls(
      dashboard.attributes as Record<string, unknown>,
      (dashboard as { references?: never[] }).references ?? []
    ).filter(({ type }) => type === 'options_list_control');
    expect(optionsList).toBeDefined();
    const filters: unknown[] = [];
    const searches: unknown[] = [];
    const converted = await convertDashboard({
      ndjson,
      dashboardId: LOGS,
      now: Date.parse('2026-10-20T00:00:00Z'),
      executeEsql: async (esql, options) => {
        filters.push(options?.filter);
        return executeEsql(esql);
      },
      search: async (_index, body) => {
        searches.push(body);
        return { hits: { hits: [] }, aggregations: {} };
      },
      controls: [{ ...optionsList, config: { ...optionsList.config, selected_options: ['IN'] } }],
      resolveField: async (dataViewId, name) => ({
        dataView: { id: dataViewId, title: 'kibana_sample_data_logs', fields: [] },
        field: { name, type: 'string' },
      }),
    });
    const phrase = { match_phrase: { [String(optionsList.config.field_name)]: 'IN' } };
    expect(converted.diagnostics).toEqual([]);
    expect(filters.length).toBeGreaterThan(0);
    for (const filter of filters.filter(Boolean)) {
      expect(JSON.stringify(filter)).toContain(JSON.stringify(phrase));
    }
    expect(searches.some((body) => JSON.stringify(body).includes(JSON.stringify(phrase)))).toBe(
      true
    );
  });
});

describe('Discover sessions', () => {
  const flights = readFileSync(join(__dirname, '../fixtures/flights_sample.ndjson'), 'utf8');
  const FLIGHTS = '7adfa750-4c81-11e8-b3d7-01146121b73d';

  it('runs the selected tab as Discover does: its data view, sort and sample size', async () => {
    const queries: string[] = [];
    const converted = await convertDashboard({
      ndjson: flights,
      dashboardId: FLIGHTS,
      now: Date.parse('2026-10-20T00:00:00Z'),
      executeEsql: async (esql) => {
        queries.push(esql);
        return {
          columns: [
            { name: 'timestamp', type: 'date' },
            { name: 'Carrier', type: 'keyword' },
            { name: 'OriginCityName', type: 'keyword' },
          ],
          values: [['2026-10-19T10:00:00.000Z', 'JetBeats', 'Chicago']],
        };
      },
      search: async () => ({ hits: { hits: [] }, aggregations: {} }),
    });
    expect(queries).toContain(
      'FROM kibana_sample_data_flights | SORT `timestamp` DESC | LIMIT 100'
    );
    const log = converted.panels.find(({ title }) => title === '[Flights] Flight Log');
    expect(log).toMatchObject({ outcome: { status: 'converted', nodeType: 'table' } });
    expect(converted.panels.map(({ title }) => title)).toContain('[Flights] Flight Log');
  });

  it('finds a search source for every saved search and Discover session in the corpus', () => {
    const searches = corpusObjects(['search'], 'searchSourceJSON');
    expect(searches.length).toBeGreaterThan(50);
    const missing = searches.filter(
      ({ attributes }) =>
        !selectedAttributes(attributes as never, {}).kibanaSavedObjectMeta?.searchSourceJSON
    );
    expect(missing.map(({ file, id }) => `${file} ${id}`)).toEqual([]);
  });
});

describe('convertDashboard with Vega results', () => {
  it('keeps a Vega panel’s query in its spec, its results beside it pruned to what the drawing reads', async () => {
    const flights = readFileSync(join(__dirname, '../fixtures/flights_sample.ndjson'), 'utf8');
    const location = (lat: number, lon: number) => ({
      hits: {
        hits: [
          { _source: { OriginLocation: { lat, lon }, DestLocation: { lat, lon }, Origin: 'X' } },
        ],
      },
    });
    // Airport Connections' shape: every origin with every destination, which only a hover draws.
    const airports = Array.from({ length: 60 }, (_, origin) => ({
      key: `A${origin}`,
      doc_count: origin + 1,
      originLocation: location(origin / 2, origin - 30),
      distinations: {
        buckets: Array.from({ length: 60 }, (_unused, dest) => ({
          key: `A${dest}`,
          doc_count: 1,
          destLocation: location(dest / 2, dest - 30),
        })),
      },
    }));
    const converted = await convertDashboard({
      ndjson: flights,
      dashboardId: '7adfa750-4c81-11e8-b3d7-01146121b73d',
      now: Date.parse('2026-10-20T00:00:00Z'),
      executeEsql,
      search: async (_index, body) =>
        (body.aggs as Record<string, unknown> | undefined)?.origins
          ? { aggregations: { origins: { buckets: airports } } }
          : { hits: { hits: [] }, aggregations: {} },
    });
    const panel = converted.panels.find(({ title }) => title?.includes('Airport Connections'));
    expect(panel?.outcome.status).toBe('converted');
    const node = panel!.node as {
      spec: { data: Array<Record<string, unknown>> };
      results: Array<{ path: unknown[]; values: unknown; scope: string }>;
    };
    expect(node.spec.data[0].url).toMatchObject({ index: 'kibana_sample_data_flights' });
    expect(node.results).toEqual([
      { path: ['data', 0], values: expect.anything(), scope: 'static' },
    ]);
    const size = (value: unknown): number =>
      value !== null && typeof value === 'object'
        ? 1 + Object.values(value).reduce<number>((sum, child) => sum + size(child), 0)
        : 1;
    expect(size({ aggregations: { origins: { buckets: airports } } })).toBeGreaterThan(20000);
    expect(size(node.results)).toBeLessThan(2000);
    expect(vegaSchema.safeParse({ ...node, caption: 'Airports.' }).success).toBe(true);
  });
});

describe('convertDashboard with a Vega-Lite map', () => {
  it('compiles as Kibana does, then puts each source’s query back where its result goes', async () => {
    const vlMap = JSON.stringify({
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      config: { kibana: { type: 'map', latitude: 30, longitude: -100, zoom: 3, mapStyle: false } },
      data: {
        url: { index: 'kibana_sample_data_flights', body: { size: 0 } },
        format: { property: 'aggregations.origins.buckets' },
      },
      mark: 'circle',
      encoding: {
        longitude: { field: 'lon', type: 'quantitative' },
        latitude: { field: 'lat', type: 'quantitative' },
      },
    });
    const flights = readFileSync(join(__dirname, '../fixtures/flights_sample.ndjson'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => {
        const object = JSON.parse(line);
        if (object.id !== 'ed78a660-53a0-11e8-acbd-0be0ad9d822b') return line;
        const visState = JSON.parse(object.attributes.visState);
        visState.params.spec = vlMap;
        return JSON.stringify({
          ...object,
          attributes: { ...object.attributes, visState: JSON.stringify(visState) },
        });
      })
      .join('\n');
    const buckets = [
      { lat: 30, lon: -100, unused: 'x' },
      { lat: 35, lon: -90, unused: 'y' },
    ];
    const converted = await convertDashboard({
      ndjson: flights,
      dashboardId: '7adfa750-4c81-11e8-b3d7-01146121b73d',
      now: Date.parse('2026-10-20T00:00:00Z'),
      executeEsql,
      search: async (_index, body) =>
        body.size === 0 && !body.aggs
          ? { aggregations: { origins: { buckets } } }
          : { hits: { hits: [] }, aggregations: {} },
    });
    const panel = converted.panels.find(
      ({ panelId, node }) =>
        node?.mode && panelId && node.type === 'vega' && JSON.stringify(node).includes('"circle"')
    );
    expect(panel?.outcome.status).toBe('converted');
    const node = panel!.node as {
      mode: string;
      spec: Record<string, unknown>;
      results: Array<{ path: Array<string | number>; values: unknown }>;
    };
    expect(node.mode).toBe('vega');
    const [{ path, values }] = node.results;
    const entry = path.reduce<unknown>(
      (cursor, key) => (cursor as Record<string | number, unknown>)[key],
      node.spec
    ) as Record<string, unknown>;
    expect(entry.url).toMatchObject({ index: 'kibana_sample_data_flights' });
    expect(entry.values).toBeUndefined();
    // Vega-Lite's compiled data lists each row's keys, so the rows stay whole: kept, not guessed at.
    expect(values).toMatchObject({ aggregations: { origins: { buckets } } });
    expect(vegaSchema.safeParse({ ...node, caption: 'Points.' }).success).toBe(true);
  });
});
