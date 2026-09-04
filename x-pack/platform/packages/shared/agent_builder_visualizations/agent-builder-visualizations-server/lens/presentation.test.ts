/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { LensConfigBuilder, lensApiConfigSchema } from '@kbn/lens-embeddable-utils';
import { editLensPresentation, lensPresentationEditSchema } from './presentation';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

const xy = {
  type: 'xy',
  title: 'Requests',
  layers: [
    {
      type: 'line',
      data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*) BY host' },
      x: { column: 'host' },
      y: [{ column: 'count', color: { type: 'static', color: '#ff0000' } }],
    },
  ],
  legend: {
    placement: 'inside',
    position: 'top_right',
    columns: 3,
    layout: { type: 'grid' },
    visibility: 'visible',
  },
  hide_border: true,
  drilldowns: [{ id: 'keep-me' }],
};

describe('Lens presentation', () => {
  it('applies explicit edits to the rendered Lens legend without changing data', () => {
    const builder = new LensConfigBuilder();
    const original = cloneDeep(xy);
    const result = editLensPresentation(xy, {
      changes: [
        { operation: 'set', path: 'axis.x.title.visible', value: false },
        { operation: 'set', path: 'legend.placement', value: 'outside' },
        { operation: 'set', path: 'legend.position', value: 'bottom' },
        { operation: 'remove', path: 'legend.layout' },
        { operation: 'remove', path: 'legend.columns' },
        { operation: 'set', path: 'legend.visibility', value: 'hidden' },
      ],
    });
    expect(result.layers).toEqual(xy.layers);
    expect(result.legend).toEqual({
      placement: 'outside',
      position: 'bottom',
      visibility: 'hidden',
    });
    expect(result.hide_border).toBe(true);
    expect(result.drilldowns).toEqual(xy.drilldowns);
    const rendered = builder.fromAPIFormat(lensApiConfigSchema.parse(result));
    expect(rendered.state.visualization).toMatchObject({
      legend: { isVisible: false, position: 'bottom' },
    });
    expect(xy).toEqual(original);
  });

  it('preserves statistics when editing legend placement', () => {
    const result = editLensPresentation(
      { ...xy, legend: { ...xy.legend, statistics: ['avg', 'min', 'max'] } },
      {
        changes: [
          { operation: 'set', path: 'legend.placement', value: 'outside' },
          { operation: 'set', path: 'legend.position', value: 'bottom' },
          { operation: 'remove', path: 'legend.layout' },
          { operation: 'remove', path: 'legend.columns' },
        ],
      }
    );
    expect(result.legend.statistics).toEqual(['avg', 'min', 'max']);
    expect(result.legend.visibility).toBe('visible');
  });

  it('restyles a time-series line as a gradient area without changing its data or bindings', () => {
    const query = 'FROM logs | STATS count = COUNT(*) BY timestamp = BUCKET(@timestamp, 1 hour)';
    const layer = {
      ...xy.layers[0],
      data_source: { type: 'esql', query },
      x: { column: 'timestamp' },
    };
    const config = { ...xy, layers: [layer] };
    const result = editLensPresentation(config, {
      changes: [
        { operation: 'set', path: 'layers.0.type', value: 'area' },
        { operation: 'set', path: 'styling.areas.fill', value: 'gradient' },
      ],
    });
    expect(result).toEqual({
      ...config,
      layers: [{ ...layer, type: 'area' }],
      styling: { areas: { fill: 'gradient' } },
    });
    expect(config.layers[0].type).toBe('line');
    const rendered = new LensConfigBuilder().fromAPIFormat(lensApiConfigSchema.parse(result));
    expect(rendered.state.visualization).toMatchObject({
      layers: [expect.objectContaining({ seriesType: 'area' })],
      areaFill: 'gradient',
    });
  });

  it('supports explicit removal of nested colors without replacing layers or bindings', () => {
    const result = editLensPresentation(xy, {
      changes: [{ operation: 'remove', path: 'layers.0.y.0.color' }],
    });
    expect(result.layers).toEqual([{ ...xy.layers[0], y: [{ column: 'count' }] }]);
    expect(xy.layers[0].y[0].color).toBeDefined();
  });

  it('edits metric title and colors explicitly, preserving background chart bindings', () => {
    const metric = {
      type: 'metric',
      title: 'Count',
      data_source: { type: 'esql', query: 'ROW count=10, max=100' },
      metrics: [
        {
          type: 'primary',
          column: 'count',
          color: { type: 'static', color: '#ff0000' },
          apply_color_to: 'background',
          background_chart: { type: 'bar', max_value: { column: 'max' } },
        },
      ],
    };
    const result = editLensPresentation(metric, {
      changes: [
        { operation: 'set', path: 'title', value: '' },
        { operation: 'remove', path: 'metrics.0.color' },
        { operation: 'remove', path: 'metrics.0.apply_color_to' },
      ],
    });
    expect(result.title).toBe('');
    expect(result.metrics[0]).toEqual({
      type: 'primary',
      column: 'count',
      background_chart: metric.metrics[0].background_chart,
    });
    const titleOnly = editLensPresentation(metric, {
      changes: [{ operation: 'set', path: 'title', value: '' }],
    });
    expect(titleOnly.metrics).toEqual(metric.metrics);
    const colorOnly = editLensPresentation(metric, {
      changes: [{ operation: 'remove', path: 'metrics.0.color' }],
    });
    expect(colorOnly.metrics[0]).not.toHaveProperty('color');
    expect(colorOnly.metrics[0].apply_color_to).toBe('background');
  });

  it('preserves gauge bounds, goal, and thresholds on unrelated edits', () => {
    const gauge = {
      type: 'gauge',
      data_source: { type: 'esql', query: 'ROW value=10, min=0, max=100, goal=90' },
      metric: {
        column: 'value',
        min: { column: 'min' },
        max: { column: 'max' },
        goal: { column: 'goal' },
        color: {
          type: 'dynamic',
          range: 'absolute',
          steps: [
            { gte: 0, lt: 90, color: '#24c292' },
            { gte: 90, color: '#f6726a' },
          ],
        },
      },
    };
    expect(
      editLensPresentation(gauge, {
        changes: [{ operation: 'set', path: 'title', value: 'Capacity' }],
      }).metric
    ).toEqual(gauge.metric);
  });

  it('explicitly removes gauge bounds and an unrequested goal without modifying the query', () => {
    const gauge = {
      type: 'gauge',
      data_source: { type: 'esql', query: 'ROW value=10, min=0, max=100, goal=90' },
      metric: {
        column: 'value',
        min: { column: 'min' },
        max: { column: 'max' },
        goal: { column: 'goal' },
      },
    };
    const result = editLensPresentation(gauge, {
      changes: [
        { operation: 'remove', path: 'metric.min' },
        { operation: 'remove', path: 'metric.max' },
        { operation: 'remove', path: 'metric.goal' },
      ],
    });
    expect(result).toEqual({ ...gauge, metric: { column: 'value' } });
    expect(gauge.metric.min).toEqual({ column: 'min' });
    expect(gauge.metric.max).toEqual({ column: 'max' });
    expect(gauge.metric.goal).toEqual({ column: 'goal' });
  });

  it('supports form-based Lens without changing its data source or aggregation', () => {
    const config = {
      type: 'xy',
      layers: [
        {
          type: 'bar',
          data_source: { type: 'data_view_reference', ref_id: 'logs' },
          y: [{ operation: 'count' }],
        },
      ],
    };
    const result = editLensPresentation(config, {
      changes: [{ operation: 'set', path: 'axis.x.title.visible', value: false }],
    });
    expect(result.layers).toEqual(config.layers);
    expect(lensApiConfigSchema.safeParse(result).success).toBe(true);
  });

  it.each([
    'type',
    'layers',
    'layers.0.type',
    'visualization.legend.isVisible',
    'legend.nonexistent',
  ])('rejects invalid Lens configuration at %s atomically', (path) => {
    const original = cloneDeep(xy);
    expect(() =>
      editLensPresentation(xy, {
        changes: [
          { operation: 'set', path: 'axis.x.title.visible', value: false },
          { operation: 'set', path, value: 'bad' },
        ],
      })
    ).toThrow(/Lens/);
    expect(xy).toEqual(original);
  });

  it('edits number formats without a chart-specific path list', () => {
    const result = editLensPresentation(xy, {
      changes: [
        { operation: 'set', path: 'layers.0.y.0.format.type', value: 'number' },
        { operation: 'set', path: 'layers.0.y.0.format.decimals', value: 0 },
        { operation: 'set', path: 'layers.0.y.0.format.compact', value: true },
      ],
    });
    expect(result.layers[0]).toEqual({
      ...xy.layers[0],
      y: [{ ...xy.layers[0].y[0], format: { type: 'number', decimals: 0, compact: true } }],
    });
    expect(xy.layers[0].y[0]).not.toHaveProperty('format');
  });

  it('edits individual fields inside an existing color configuration', () => {
    const result = editLensPresentation(xy, {
      changes: [{ operation: 'set', path: 'layers.0.y.0.color.color', value: '#24c292' }],
    });
    expect(result.layers[0]).toEqual({
      ...xy.layers[0],
      y: [{ ...xy.layers[0].y[0], color: { type: 'static', color: '#24c292' } }],
    });
  });

  it('does not follow inherited properties when removing a field', () => {
    const originalName = Object.prototype.toString.name;
    expect(
      editLensPresentation(xy, {
        changes: [{ operation: 'remove', path: 'toString.name' }],
      })
    ).toEqual(xy);
    expect(Object.prototype.toString.name).toBe(originalName);
  });

  it('validates structure without enforcing the agent instruction to preserve queries and bindings', () => {
    const query = 'FROM logs | STATS total = COUNT(*) BY host';
    const result = editLensPresentation(xy, {
      changes: [
        { operation: 'set', path: 'layers.0.data_source.query', value: query },
        { operation: 'set', path: 'layers.0.y.0.column', value: 'total' },
      ],
    });
    expect(result.layers[0].data_source.query).toBe(query);
    expect(result.layers[0].y[0].column).toBe('total');
    expect(xy.layers[0].y[0].column).toBe('count');
  });

  it.each([
    '__proto__.polluted',
    'legend.__proto__.polluted',
    'constructor.prototype.polluted',
    'legend.constructor.prototype.polluted',
    'legend[__proto__].polluted',
    'legend..visibility',
    'layers.-1.y',
  ])('rejects unsafe or malformed paths for both set and remove: %s', (path) => {
    const original = cloneDeep(xy);
    expect(() =>
      editLensPresentation(xy, { changes: [{ operation: 'set', path, value: 'bad' }] })
    ).toThrow();
    expect(() => editLensPresentation(xy, { changes: [{ operation: 'remove', path }] })).toThrow();
    expect(xy).toEqual(original);
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it.each(['layers.1.type', 'layers.999999999.type', 'layers.length', 'legend.0'])(
    'rejects array growth and array properties before assignment: %s',
    (path) => {
      const original = cloneDeep(xy);
      expect(() =>
        editLensPresentation(xy, { changes: [{ operation: 'set', path, value: 999999999 }] })
      ).toThrow(/existing array index/);
      expect(xy).toEqual(original);
    }
  );

  it('rejects values invalid in the native Lens schema', () => {
    expect(() =>
      editLensPresentation(xy, {
        changes: [{ operation: 'set', path: 'legend.visibility', value: 'sometimes' }],
      })
    ).toThrow();
    expect(() =>
      editLensPresentation(xy, {
        changes: [{ operation: 'set', path: 'legend.statistics', value: ['not_a_statistic'] }],
      })
    ).toThrow();
  });

  it('rejects raw Lens state', () => {
    expect(() =>
      editLensPresentation(
        { attributes: {} },
        {
          changes: [{ operation: 'set', path: 'title', value: 'Title' }],
        }
      )
    ).toThrow(/Lens API/);
  });

  it('limits Vega edits to panel chrome and preserves its spec', () => {
    const vega = { spec: '{"mark":"line"}', title: 'Before', hide_border: true };
    expect(
      editLensPresentation(
        vega,
        { changes: [{ operation: 'set', path: 'hide_title', value: true }] },
        true
      )
    ).toEqual({ ...vega, hide_title: true });
    expect(() =>
      editLensPresentation(
        vega,
        { changes: [{ operation: 'set', path: 'spec', value: 'not JSON' }] },
        true
      )
    ).toThrow(/Unsupported presentation path/);
  });

  it.each([
    {},
    { defaults: ['axes'] },
    { defaults: ['axes'], changes: [{ operation: 'set', path: 'title', value: 'Title' }] },
    { changes: [] },
    { title: '' },
    { changes: [{ operation: 'set', path: 'layers', value: [{}] }] },
    { changes: [{ operation: 'set', path: 'title', value: null }] },
  ])('rejects invalid edit shape %j', (edit) => {
    expect(lensPresentationEditSchema.safeParse(edit).success).toBe(false);
  });

  it('does not fill missing settings or reset existing choices during an edit', () => {
    const minimal = { type: 'xy', layers: xy.layers };
    const changes = [{ operation: 'set' as const, path: 'title', value: 'New title' }];
    expect(editLensPresentation(minimal, { changes })).toEqual({
      ...minimal,
      title: 'New title',
    });
    expect(editLensPresentation(xy, { changes })).toEqual({ ...xy, title: 'New title' });
  });

  it.each(Object.values(SupportedChartType))(
    'validates explicit edits for %s without filling defaults',
    (type) => {
      const dataSource = { type: 'esql', query: 'ROW count=10, category="ok"' };
      const column = { column: 'count' };
      const fixtures = {
        metric: { metrics: [{ ...column, type: 'primary' }] },
        xy: {
          layers: [
            { type: 'area', data_source: dataSource, x: { column: 'category' }, y: [column] },
          ],
        },
        gauge: { metric: column },
        heatmap: { metric: column, x: { column: 'category' } },
        tag_cloud: { metric: column, tag_by: { column: 'category' } },
        region_map: { metric: column, region: { column: 'category' } },
        data_table: { metrics: [column], rows: [{ column: 'category' }] },
        pie: { metrics: [column], group_by: [{ column: 'category' }] },
        treemap: { metrics: [column], group_by: [{ column: 'category' }] },
        waffle: { metrics: [column], group_by: [{ column: 'category' }] },
        mosaic: { metric: column, group_by: [{ column: 'category' }] },
      };
      const original = {
        type,
        ...(type === 'xy' ? {} : { data_source: dataSource }),
        ...fixtures[type],
      };
      const edited = editLensPresentation(original, {
        changes: [{ operation: 'set', path: 'title', value: 'Updated title' }],
      });
      expect(lensApiConfigSchema.safeParse(edited).success).toBe(true);
      expect(edited).toEqual({ ...original, title: 'Updated title' });
    }
  );

  it('removes legacy metric coloring without replacing a form-based chart', () => {
    const original = {
      type: 'legacy_metric',
      title: 'Count',
      data_source: { type: 'data_view_reference', ref_id: 'logs' },
      metric: { operation: 'count', apply_color_to: 'background' },
    };
    const result = editLensPresentation(original, {
      changes: [
        { operation: 'set', path: 'title', value: '' },
        { operation: 'remove', path: 'metric.apply_color_to' },
      ],
    });
    expect(result).toEqual({ ...original, title: '', metric: { operation: 'count' } });
  });
});
