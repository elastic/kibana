/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeVegaSpec, VEGA_LITE_SCHEMA } from './normalize_spec';

const ESQL = 'FROM logs-* | STATS count = COUNT() BY status';

describe('normalizeVegaSpec', () => {
  it('pins the Vega-Lite v6 schema', () => {
    const result = normalizeVegaSpec({
      spec: { $schema: 'https://vega.github.io/schema/vega-lite/v5.json', mark: 'bar' },
      esqlQuery: ESQL,
    });

    expect(result.$schema).toBe(VEGA_LITE_SCHEMA);
  });

  it('injects the ES|QL query as the data source', () => {
    const result = normalizeVegaSpec({ spec: { mark: 'bar' }, esqlQuery: ESQL });

    expect(result.data).toEqual({ url: { '%type%': 'esql', query: ESQL } });
  });

  it('adds the timefield binding when provided', () => {
    const result = normalizeVegaSpec({
      spec: { mark: 'line' },
      esqlQuery: ESQL,
      timefield: '@timestamp',
    });

    expect(result.data).toEqual({
      url: { '%type%': 'esql', query: ESQL, '%timefield%': '@timestamp' },
    });
  });

  it('binds %timefield% to the source field filtered in WHERE, not a date result column', () => {
    const timeAwareEsql =
      'FROM logs-* | WHERE event.created >= ?_tstart AND event.created < ?_tend | STATS count = COUNT()';

    const result = normalizeVegaSpec({
      spec: { mark: 'line' },
      esqlQuery: timeAwareEsql,
      // A stale/aliased date result column must NOT win over the real WHERE field.
      columns: [
        { name: 'Date', type: 'date' },
        { name: 'count', type: 'long' },
      ],
    });

    expect(result.data).toEqual({
      url: { '%type%': 'esql', query: timeAwareEsql, '%timefield%': 'event.created' },
    });
  });

  it('binds %timefield% to the bucketed source field, not the bucket alias column', () => {
    // Regression: a time-series query buckets `@timestamp` under an alias (`Date`).
    // The alias is a result column, not a filterable index field, so it must not
    // become the %timefield%; the raw `@timestamp` source field must.
    const timeSeriesEsql =
      'FROM logs-* | STATS count = COUNT() BY Date = BUCKET(@timestamp, 75, ?_tstart, ?_tend)';

    const result = normalizeVegaSpec({
      spec: { mark: 'line' },
      esqlQuery: timeSeriesEsql,
      columns: [
        { name: 'Date', type: 'date' },
        { name: 'count', type: 'long' },
      ],
    });

    expect(result.data).toEqual({
      url: { '%type%': 'esql', query: timeSeriesEsql, '%timefield%': '@timestamp' },
    });
  });

  it('falls back to a date result column only when no source field is in the query', () => {
    // Time-aware via TBUCKET, which takes no field argument, so nothing to extract.
    const tbucketEsql =
      'TS metrics-* | STATS count = COUNT() BY bucket = TBUCKET(75, ?_tstart, ?_tend)';

    const result = normalizeVegaSpec({
      spec: { mark: 'line' },
      esqlQuery: tbucketEsql,
      columns: [
        { name: 'created_at', type: 'date_nanos' },
        { name: 'count', type: 'long' },
      ],
    });

    expect(result.data).toEqual({
      url: { '%type%': 'esql', query: tbucketEsql, '%timefield%': 'created_at' },
    });
  });

  it('defaults %timefield% to @timestamp when no source field or date column is available', () => {
    // Time-aware (TBUCKET binds the params) but no field to extract and no date
    // result column, so the conservative @timestamp default is used.
    const timeAwareEsql =
      'TS metrics-* | STATS count = COUNT() BY bucket = TBUCKET(75, ?_tstart, ?_tend)';

    const result = normalizeVegaSpec({
      spec: { mark: 'bar' },
      esqlQuery: timeAwareEsql,
      columns: [
        { name: 'count', type: 'long' },
        { name: 'bucket', type: 'integer' },
      ],
    });

    expect(result.data).toEqual({
      url: { '%type%': 'esql', query: timeAwareEsql, '%timefield%': '@timestamp' },
    });
  });

  it('does not add %timefield% when the query is not time-aware', () => {
    const result = normalizeVegaSpec({
      spec: { mark: 'bar' },
      esqlQuery: ESQL,
      columns: [{ name: 'status', type: 'keyword' }],
    });

    expect(result.data).toEqual({ url: { '%type%': 'esql', query: ESQL } });
  });

  it('replaces any data source the model may have authored', () => {
    const result = normalizeVegaSpec({
      spec: { data: { values: [{ a: 1 }] }, mark: 'bar' },
      esqlQuery: ESQL,
    });

    expect(result.data).toEqual({ url: { '%type%': 'esql', query: ESQL } });
  });

  describe('nested data sources', () => {
    it('strips a data source authored on a layer child so the root source flows down', () => {
      const spec = {
        layer: [
          { mark: 'bar', encoding: { y: { field: 'count' } } },
          { data: { values: [{ a: 1 }] }, mark: 'rule' },
        ],
      };
      const snapshot = JSON.parse(JSON.stringify(spec));

      const result = normalizeVegaSpec({ spec, esqlQuery: ESQL });
      const layer = result.layer as Array<Record<string, unknown>>;

      expect(result.data).toEqual({ url: { '%type%': 'esql', query: ESQL } });
      expect(layer[1]).not.toHaveProperty('data');
      expect(layer[1]).toEqual({ mark: 'rule' });
      expect(spec).toEqual(snapshot);
    });

    it('strips a data source on the child view of a facet composite', () => {
      const spec = {
        facet: { field: 'ext', type: 'nominal' },
        spec: { data: { url: 'https://example.com/x.json' }, mark: 'line' },
      };

      const result = normalizeVegaSpec({ spec, esqlQuery: ESQL });

      expect(result.data).toEqual({ url: { '%type%': 'esql', query: ESQL } });
      expect(result.spec).toEqual({ mark: 'line' });
    });

    it('strips data sources across concat array children', () => {
      const spec = {
        hconcat: [
          { data: { name: 'left' }, mark: 'bar' },
          { data: { values: [] }, mark: 'point' },
        ],
      };

      const result = normalizeVegaSpec({ spec, esqlQuery: ESQL });
      const hconcat = result.hconcat as Array<Record<string, unknown>>;

      expect(hconcat[0]).toEqual({ mark: 'bar' });
      expect(hconcat[1]).toEqual({ mark: 'point' });
    });

    it('strips data recursively through deeply nested views', () => {
      const spec = {
        facet: { field: 'ext', type: 'nominal' },
        spec: {
          data: { values: [{ a: 1 }] },
          layer: [{ mark: 'bar' }, { data: { url: 'https://example.com/y.json' }, mark: 'rule' }],
        },
      };

      const result = normalizeVegaSpec({ spec, esqlQuery: ESQL });
      const innerSpec = result.spec as Record<string, unknown>;
      const innerLayer = innerSpec.layer as Array<Record<string, unknown>>;

      expect(innerSpec).not.toHaveProperty('data');
      expect(innerLayer[1]).toEqual({ mark: 'rule' });
    });
  });

  it('strips fixed top-level sizing in favor of fit autosize', () => {
    const result = normalizeVegaSpec({
      spec: { width: 600, height: 400, autosize: 'pad', mark: 'bar' },
      esqlQuery: ESQL,
    });

    expect(result.width).toBeUndefined();
    expect(result.height).toBeUndefined();
    expect(result.autosize).toEqual({ type: 'fit', contains: 'padding' });
  });

  it('keeps fit autosize for a layered view', () => {
    const result = normalizeVegaSpec({
      spec: { layer: [{ mark: 'bar' }, { mark: 'rule' }] },
      esqlQuery: ESQL,
    });

    expect(result.autosize).toEqual({ type: 'fit', contains: 'padding' });
  });

  it.each(['facet', 'repeat', 'concat', 'hconcat', 'vconcat'])(
    'does not set autosize for a %s composite view (fit is unsupported there)',
    (compositeKey) => {
      const result = normalizeVegaSpec({
        spec: {
          width: 800,
          height: 300,
          autosize: 'pad',
          [compositeKey]: {},
          spec: { mark: 'bar' },
        },
        esqlQuery: ESQL,
      });

      expect(result.autosize).toBeUndefined();
      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
      expect(result[compositeKey]).toBeDefined();
    }
  );

  it('escapes dotted field references against the injected columns', () => {
    const result = normalizeVegaSpec({
      spec: { mark: 'bar', encoding: { x: { field: 'host.name' } } },
      esqlQuery: ESQL,
    });

    expect(result.encoding).toEqual({ x: { field: 'host\\.name' } });
  });

  it('preserves unrelated spec properties and does not mutate the input', () => {
    const spec = { mark: 'bar', title: 'My chart', config: { view: { stroke: null } } };
    const snapshot = JSON.parse(JSON.stringify(spec));

    const result = normalizeVegaSpec({ spec, esqlQuery: ESQL });

    expect(result.title).toBe('My chart');
    expect(result.config).toEqual({ view: { stroke: null } });
    expect(spec).toEqual(snapshot);
  });

  describe('shared-scale layered legend conflicts', () => {
    type LayerEncoding = Array<{ encoding: { color: Record<string, unknown> } }>;

    it('drops a conflicting legend:null when another layer enables the same shared legend', () => {
      const spec = {
        layer: [
          {
            mark: 'point',
            encoding: { color: { field: 'ext', type: 'nominal', legend: { title: 'Extension' } } },
          },
          { mark: 'text', encoding: { color: { field: 'ext', type: 'nominal', legend: null } } },
        ],
        resolve: { scale: { color: 'shared' } },
      };
      const snapshot = JSON.parse(JSON.stringify(spec));

      const result = normalizeVegaSpec({ spec, esqlQuery: ESQL });
      const layer = result.layer as LayerEncoding;

      // The enabled legend is preserved; the disabling entry is removed entirely.
      expect(layer[0].encoding.color.legend).toEqual({ title: 'Extension' });
      expect(layer[1].encoding.color).toEqual({ field: 'ext', type: 'nominal' });
      expect(spec).toEqual(snapshot);
    });

    it('drops legend:null when another layer omits legend (default shows it)', () => {
      // The common model output: one layer disables the legend, the others just
      // leave it out. An omitted legend defaults to shown, so this still
      // conflicts on a shared scale and the disabling entry must be dropped.
      const spec = {
        layer: [
          { mark: 'point', encoding: { color: { field: 'ext', type: 'nominal' } } },
          { mark: 'text', encoding: { color: { field: 'ext', type: 'nominal', legend: null } } },
        ],
      };
      const snapshot = JSON.parse(JSON.stringify(spec));

      const result = normalizeVegaSpec({ spec, esqlQuery: ESQL });
      const layer = result.layer as LayerEncoding;

      expect(layer[0].encoding.color).toEqual({ field: 'ext', type: 'nominal' });
      expect(layer[1].encoding.color).toEqual({ field: 'ext', type: 'nominal' });
      expect(spec).toEqual(snapshot);
    });

    it('does not treat a constant color value as an enabled legend', () => {
      // A `color: { value: ... }` constant does not create a scale/legend, so a
      // single field-encoded layer disabling its own legend is not a conflict.
      const spec = {
        layer: [
          { mark: 'rule', encoding: { color: { value: 'red' } } },
          { mark: 'line', encoding: { color: { field: 'ext', type: 'nominal', legend: null } } },
        ],
      };

      const result = normalizeVegaSpec({ spec, esqlQuery: ESQL });
      const layer = result.layer as LayerEncoding;

      expect(layer[1].encoding.color.legend).toBeNull();
    });

    it('keeps per-layer legend:null when the color scale is independent', () => {
      const spec = {
        layer: [
          {
            mark: 'point',
            encoding: { color: { field: 'ext', type: 'nominal', legend: { title: 'Extension' } } },
          },
          { mark: 'text', encoding: { color: { field: 'ext', type: 'nominal', legend: null } } },
        ],
        resolve: { scale: { color: 'independent' } },
      };

      const result = normalizeVegaSpec({ spec, esqlQuery: ESQL });
      const layer = result.layer as LayerEncoding;

      expect(layer[1].encoding.color.legend).toBeNull();
    });

    it('leaves the spec untouched when every layer disables the legend (no conflict)', () => {
      const spec = {
        layer: [
          { mark: 'point', encoding: { color: { field: 'ext', type: 'nominal', legend: null } } },
          { mark: 'text', encoding: { color: { field: 'ext', type: 'nominal', legend: null } } },
        ],
      };

      const result = normalizeVegaSpec({ spec, esqlQuery: ESQL });
      const layer = result.layer as LayerEncoding;

      expect(layer[0].encoding.color.legend).toBeNull();
      expect(layer[1].encoding.color.legend).toBeNull();
    });
  });
});
