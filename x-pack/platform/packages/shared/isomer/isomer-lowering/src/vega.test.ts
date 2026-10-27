/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { join } from 'node:path';
import { readFileSync } from 'node:fs';

import { planDashboard } from './dashboard';
import {
  kibanaSearchBody,
  parseKibanaVegaSpec,
  selectionsToDsl,
  VegaSourceError,
  vegaSources,
} from './vega';

const SAMPLE = readFileSync(join(__dirname, '../fixtures/web_logs_sample.ndjson'), 'utf8');
const SAMPLE_ID = 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b';

const vegaSpecs = SAMPLE.split('\n')
  .filter(Boolean)
  .map(
    (line) => JSON.parse(line) as { type: string; attributes: { title: string; visState?: string } }
  )
  .filter(({ type }) => type === 'visualization')
  .map(({ attributes: { title, visState } }) => ({
    title,
    visState: JSON.parse(visState ?? '{}') as { type: string; params?: { spec?: string } },
  }))
  .filter(({ visState }) => visState.type === 'vega')
  .map(({ title, visState }) => ({ title, text: visState.params?.spec ?? '' }));

describe('parseKibanaVegaSpec', () => {
  it('parses the sample dashboard HJSON specs and finds one Elasticsearch source each', () => {
    expect(
      vegaSpecs.map(({ title, text }) => {
        const { mode, spec } = parseKibanaVegaSpec(text);
        return {
          title,
          mode,
          sources: vegaSources(spec).map(({ path, url }) => ({
            path,
            index: url.index,
            timefield: url['%timefield%'],
          })),
        };
      })
    ).toEqual([
      {
        title: '[Logs] Visitors Map',
        mode: 'vega',
        sources: [{ path: ['data', 0], index: 'kibana_sample_data_logs', timefield: 'timestamp' }],
      },
      {
        title: '[Logs] Unique Destination Heatmap',
        mode: 'vega-lite',
        sources: [{ path: ['data'], index: 'kibana_sample_data_logs', timefield: '@timestamp' }],
      },
      {
        title: '[Logs] Machine OS and Destination Sankey Chart',
        mode: 'vega',
        sources: [{ path: ['data', 0], index: 'kibana_sample_data_logs', timefield: 'timestamp' }],
      },
    ]);
  });
});

describe('kibanaSearchBody', () => {
  const url = {
    index: 'logs',
    '%context%': true,
    '%timefield%': 'timestamp',
    body: { size: 0, aggs: { a: { terms: { field: 'x' } } } },
  };

  it('replaces %context% with the time range and selection filters', () => {
    const filters = selectionsToDsl([
      {
        panelId: 'p',
        predicates: [
          { field: 'geo.dest', value: 'CN' },
          { field: 'bytes', range: { gte: 0, lt: 1000 } },
        ],
      },
    ]);
    expect(kibanaSearchBody(url, { timeRange: { from: 'now-7d', to: 'now' }, filters })).toEqual({
      size: 0,
      aggs: { a: { terms: { field: 'x' } } },
      query: {
        bool: {
          must: [],
          filter: [
            {
              range: {
                timestamp: { gte: 'now-7d', lte: 'now', format: 'strict_date_optional_time' },
              },
            },
            { term: { 'geo.dest': 'CN' } },
            { range: { bytes: { gte: 0, lt: 1000 } } },
          ],
          should: [],
          must_not: [],
        },
      },
    });
  });

  it("adds the data view's runtime fields", () => {
    const runtimeMappings = { hour_of_day: { type: 'long', script: { source: 'emit(1);' } } };
    expect(kibanaSearchBody({ index: 'logs', body: { size: 0 } }, { runtimeMappings })).toEqual({
      size: 0,
      runtime_mappings: runtimeMappings,
    });
  });

  it('leaves a body without %context% alone', () => {
    expect(kibanaSearchBody({ index: 'logs', body: { size: 0 } }, {})).toEqual({ size: 0 });
  });

  it('refuses placeholders it does not implement', () => {
    expect(() =>
      kibanaSearchBody(
        {
          ...url,
          body: { aggs: { h: { date_histogram: { interval: { '%autointerval%': true } } } } },
        },
        {}
      )
    ).toThrow(VegaSourceError);
    expect(() => kibanaSearchBody({ ...url, '%dashboard_context-must_clause%': true }, {})).toThrow(
      VegaSourceError
    );
  });

  it('substitutes the dashboard context clauses and the time filter in the body', () => {
    const filters = [{ term: { host: 'a' } }];
    const body = {
      query: {
        bool: {
          must: ['%dashboard_context-must_clause%', { match: { x: 1 } }],
          filter: [
            '%dashboard_context-filter_clause%',
            { range: { '@timestamp': { '%timefilter%': true } } },
          ],
          must_not: ['%dashboard_context-must_not_clause%'],
        },
      },
    };
    expect(
      kibanaSearchBody({ index: 'logs', body }, { timeRange: { from: 'a', to: 'b' }, filters })
    ).toEqual({
      query: {
        bool: {
          must: [{ match: { x: 1 } }],
          filter: [
            { term: { host: 'a' } },
            {
              range: { '@timestamp': { gte: 'a', lte: 'b', format: 'strict_date_optional_time' } },
            },
          ],
          must_not: [],
        },
      },
    });
  });

  it('still refuses a shifted time filter', () => {
    expect(() =>
      kibanaSearchBody(
        {
          index: 'logs',
          body: { query: { range: { t: { '%timefilter%': true, shift: 1, unit: 'day' } } } },
        },
        { timeRange: { from: 'a', to: 'b' } }
      )
    ).toThrow(VegaSourceError);
  });
});

describe('planDashboard', () => {
  it('plans the sample dashboard Vega panels as sized `vega` nodes', () => {
    const { spec, vegaPanels, diagnostics } = planDashboard(SAMPLE, SAMPLE_ID, {
      timeRange: { from: 'now-7d', to: 'now' },
    });
    expect(JSON.stringify(diagnostics)).not.toContain('vega-degraded');
    expect(
      vegaPanels.every(({ sources }) =>
        sources.every(({ runtimeMappings }) => runtimeMappings && 'hour_of_day' in runtimeMappings)
      )
    ).toBe(true);
    expect(
      vegaPanels.map(({ panelId, sources }) => ({ panelId, sources: sources.length }))
    ).toEqual([
      { panelId: '4', sources: 1 },
      { panelId: '14', sources: 1 },
      { panelId: '8e59c7cf-6e42-4343-a113-c4a255fcf2ce', sources: 1 },
    ]);
    for (const { specPath } of vegaPanels) {
      const node = specPath.reduce<unknown>(
        (cursor, key) => (cursor as Record<string | number, unknown>)[key],
        spec
      ) as Record<string, unknown>;
      expect(node).toMatchObject({
        type: 'vega',
        width: expect.any(Number),
        height: expect.any(Number),
        caption: expect.any(String),
      });
      expect((node.spec as { title?: unknown }).title).toBe(node.caption);
    }
  });
});
