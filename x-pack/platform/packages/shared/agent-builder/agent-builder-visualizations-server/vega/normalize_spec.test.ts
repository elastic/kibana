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

  it('binds %timefield% to a date result column when the query uses time-picker params', () => {
    const timeAwareEsql =
      'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS count = COUNT()';

    const result = normalizeVegaSpec({
      spec: { mark: 'line' },
      esqlQuery: timeAwareEsql,
      columns: [
        { name: 'event.created', type: 'date' },
        { name: 'count', type: 'long' },
      ],
    });

    expect(result.data).toEqual({
      url: { '%type%': 'esql', query: timeAwareEsql, '%timefield%': 'event.created' },
    });
  });

  it('defaults %timefield% to @timestamp when the time-aware query has no date column', () => {
    const timeAwareEsql =
      'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend ' +
      '| STATS count = COUNT() BY hour = DATE_EXTRACT("hour_of_day", @timestamp)';

    const result = normalizeVegaSpec({
      spec: { mark: 'bar' },
      esqlQuery: timeAwareEsql,
      columns: [
        { name: 'count', type: 'long' },
        { name: 'hour', type: 'integer' },
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
