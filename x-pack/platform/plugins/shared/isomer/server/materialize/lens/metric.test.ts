/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chroma from 'chroma-js';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { MetricNode } from '@kbn/isomer';
import { euiDarkVars, euiLightVars } from '@kbn/ui-theme';
import type { MaterializeContext } from '../../../common';
import type { KitServices } from '../kit/create_kit';
import { createMaterializeKit } from '../kit/create_kit';
import { createTestKitServices } from '../kit/kit_services.mock';
import type { MaterializedNode } from '../nodes';
import type { MaterializeResults } from '../types';
import { createNodeValidator } from '../validate_node';
import { corpusCases } from './__fixtures__/corpus_cases';
import { corpusTable, esqlTable } from './__fixtures__/esql_table';
import { createLensMaterializer } from './materializer';
import type { LensMaterializeConfig } from './types';

const validate = createNodeValidator();
const materializer = createLensMaterializer({
  getTransformOut: () => undefined,
  basePath: { get: () => '' },
});

let services: KitServices;
beforeAll(async () => {
  services = await createTestKitServices({ 'dateFormat:tz': 'UTC' });
});

const map = (
  config: unknown,
  tables: Datatable[],
  context: MaterializeContext = {},
  parsed: LensMaterializeConfig = materializer.parse(config)
): MaterializedNode => {
  const results: MaterializeResults = { tables, nodes: [] };
  return materializer.map(parsed, results, createMaterializeKit(services, context));
};

const asMetric = (node: MaterializedNode): MetricNode => {
  expect(node.type).toBe('metric');
  return node as MetricNode;
};

const hex = (cssColor: string) => chroma(cssColor).hex();

const esqlMetric = (overrides: Record<string, unknown> = {}) => ({
  type: 'metric',
  title: 'Bytes',
  data_source: { type: 'esql', query: 'FROM logs | STATS bytes = SUM(bytes), max = MAX(bytes)' },
  metrics: [{ type: 'primary', column: 'bytes' }],
  ...overrides,
});

const bytesTable = (rows: unknown[][] = [[1200, 5000]]) =>
  esqlTable(
    [
      { name: 'bytes', type: 'long' },
      { name: 'max', type: 'long' },
    ],
    rows
  );

describe('Lens metric mapping, against the corpus', () => {
  it('colors the value with the band Kibana painted it with', async () => {
    const { config, light, dark } = corpusCases.logsUniqueVisitors;
    const table = corpusTable('logsUniqueVisitors');
    const node = asMetric(map(config, [table]));
    expect(await validate(node)).toEqual([]);

    expect(node.value).toMatchObject({
      column: 'Unique Visitors',
      color: 'bands',
      bandsRange: 'absolute',
    });
    const value = table.rows[0]['Unique Visitors'];
    const band = node.colors?.bands?.find(
      ({ from = -Infinity, to = Infinity }) => value >= from && value < to
    );
    expect(band?.color).toEqual({
      light: hex(light.metric!.background),
      dark: hex(dark.metric!.background),
    });
    expect(node.data.columns[0]).toMatchObject({ label: light.metric?.texts[0], role: 'metric' });
  });

  it.each(['logsVisits', 'logs4xxPercent', 'signedAverage'])(
    'maps %s with the label Kibana shows and no color of its own',
    async (name) => {
      const { config, light } = corpusCases[name];
      const node = asMetric(map(config, [corpusTable(name)]));
      expect(await validate(node)).toEqual([]);
      expect(node.value.color).toBeUndefined();
      expect(node.data.columns[0].label).toBe(light.metric?.texts[0]);
      expect(node.data.rows).toHaveLength(1);
    }
  );

  it('formats the value column as Kibana formatted it', () => {
    const { config, table } = corpusCases.logs4xxPercent;
    const node = asMetric(map(config, [corpusTable('logs4xxPercent')]));
    const [column] = node.data.columns;
    expect((column.source as { column: { meta: { params: unknown } } }).column.meta.params).toEqual(
      table?.columns[0].meta.params
    );
    expect(column.format).toMatchObject({
      kind: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  });

  it('carries the styling Lens sets', () => {
    const { config } = corpusCases.logsVisits;
    const node = asMetric(map(config, [corpusTable('logsVisits')]));
    expect(node.layout).toEqual({
      density: 'compact',
      valuePosition: 'bottom',
      labelsAlignment: 'left',
      valueAlignment: 'right',
      valueSizing: 'auto',
    });
  });
});

describe('Lens metric mapping', () => {
  it('compares a secondary value with the text colors Lens uses for its palette', async () => {
    const config = esqlMetric({
      metrics: [
        { type: 'primary', column: 'bytes' },
        { type: 'secondary', column: 'max', compare: { to: 'baseline', baseline: 10 } },
      ],
    });
    const node = asMetric(map(config, [bytesTable()]));
    expect(await validate(node)).toEqual([]);
    // Lens's metric helpers: compare_to is danger, paragraph text and success.
    expect(node.secondary?.compare).toEqual({
      to: 'baseline',
      baseline: 10,
      showIcon: true,
      showValue: true,
      colors: {
        decrease: {
          light: hex(euiLightVars.euiColorTextDanger),
          dark: hex(euiDarkVars.euiColorTextDanger),
        },
        neutral: {
          light: hex(euiLightVars.euiColorTextParagraph),
          dark: hex(euiDarkVars.euiColorTextParagraph),
        },
        increase: {
          light: hex(euiLightVars.euiColorTextSuccess),
          dark: hex(euiDarkVars.euiColorTextSuccess),
        },
      },
    });
    expect(node.losses).toEqual([expect.objectContaining({ path: 'metrics[1].compare' })]);
  });

  it('reverses the compare colors for a reversed palette', () => {
    const config = esqlMetric({
      metrics: [
        { type: 'primary', column: 'bytes' },
        {
          type: 'secondary',
          column: 'max',
          compare: { to: 'primary', palette: 'compare_to_reversed' },
        },
      ],
    });
    const { compare } = asMetric(map(config, [bytesTable()])).secondary ?? {};
    expect(compare?.to).toBe('primary');
    expect(compare?.colors.decrease).toMatchObject({
      light: hex(euiLightVars.euiColorTextSuccess),
    });
    expect(compare?.colors.increase).toMatchObject({ light: hex(euiLightVars.euiColorTextDanger) });
  });

  it('draws a bar to the max column in the color Lens defaults to', async () => {
    const config = esqlMetric({
      metrics: [
        {
          type: 'primary',
          column: 'bytes',
          background_chart: { type: 'bar', max_value: { column: 'max' } },
        },
      ],
    });
    const node = asMetric(map(config, [bytesTable()]));
    expect(await validate(node)).toEqual([]);
    expect(node.background).toEqual({ kind: 'bar', max: 'max', orientation: 'vertical' });
    // Lens's metric visualization: a numeric value over a bar defaults to euiColorVis2.
    const vis2 = hex(euiLightVars.euiColorVis2);
    expect(node.value.color).toEqual({ light: vis2, dark: vis2 });
  });

  it('drops the trend line and says so', () => {
    const config = esqlMetric({
      metrics: [{ type: 'primary', column: 'bytes', background_chart: { type: 'trend' } }],
    });
    const node = asMetric(map(config, [bytesTable()]));
    expect(node.background).toBeUndefined();
    expect(node.losses).toEqual([
      expect.objectContaining({ path: 'metrics[0].background_chart', kind: 'dropped' }),
    ]);
  });

  it('shows the first row, as Kibana does, when a metric without a breakdown gets more', async () => {
    const node = asMetric(
      map(esqlMetric(), [
        bytesTable([
          [1, 2],
          [3, 4],
        ]),
      ])
    );
    expect(await validate(node)).toEqual([]);
    expect(node.data.rows).toEqual([[1, 2]]);
    expect(node.losses).toEqual([expect.objectContaining({ path: 'data.rows', kind: 'dropped' })]);
  });

  it('makes one selectable tile per breakdown value', async () => {
    const config = esqlMetric({
      metrics: [{ type: 'primary', column: 'bytes' }],
      breakdown_by: { column: 'host', columns: 3 },
    });
    const table = esqlTable(
      [
        { name: 'bytes', type: 'long' },
        { name: 'host', type: 'keyword' },
      ],
      [
        [10, 'a'],
        [20, 'b'],
      ]
    );
    const node = asMetric(map(config, [table]));
    expect(await validate(node)).toEqual([]);
    expect(node.breakdown).toEqual({ column: 'host', maxColumns: 3 });
    expect(node.interactions).toEqual({ select: ['tile'] });
    expect(node.data.columns.map(({ id, role }) => [id, role])).toEqual([
      ['bytes', 'metric'],
      ['host', 'dimension'],
    ]);
  });

  it("collapses a breakdown into one value with Lens's collapse function", async () => {
    const config = esqlMetric({
      metrics: [{ type: 'primary', column: 'bytes' }],
      breakdown_by: { column: 'host', columns: 3, collapse_by: 'avg' },
    });
    const table = esqlTable(
      [
        { name: 'bytes', type: 'long' },
        { name: 'host', type: 'keyword' },
      ],
      [
        [10, 'a'],
        [20, 'b'],
        [null, 'c'],
      ]
    );
    const node = asMetric(map(config, [table]));
    expect(await validate(node)).toEqual([]);
    expect(node.breakdown).toBeUndefined();
    // Lens's collapse skips nulls and keeps only the metric columns.
    expect(node.data.columns.map(({ id }) => id)).toEqual(['bytes']);
    expect(node.data.rows).toEqual([[15]]);
  });

  it('maps a static color and where it applies', () => {
    const config = esqlMetric({
      metrics: [
        {
          type: 'primary',
          column: 'bytes',
          color: { type: 'static', color: '#FF0000' },
          apply_color_to: 'value',
        },
      ],
    });
    const { value } = asMetric(map(config, [bytesTable()]));
    expect(value).toMatchObject({
      color: { light: '#ff0000', dark: '#ff0000' },
      applyColorTo: 'value',
    });
  });

  it('maps color steps to bands, open at either end as in Lens', () => {
    const config = esqlMetric({
      metrics: [
        {
          type: 'primary',
          column: 'bytes',
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: [
              { lt: 10, color: '#000' },
              { gte: 10, color: '#fff' },
            ],
          },
        },
      ],
    });
    const node = asMetric(map(config, [bytesTable()]));
    expect(node.colors?.bands).toEqual([
      { to: 10, color: { light: '#000000', dark: '#000000' } },
      { from: 10, color: { light: '#ffffff', dark: '#ffffff' } },
    ]);
  });

  it('links a saved chart back to Lens on the time range it was queried for', () => {
    const parsed = {
      ...materializer.parse(esqlMetric()),
      savedObject: { id: 'abc', path: '/s/team/app/lens#/edit/abc' },
    };
    const node = asMetric(
      map(
        undefined,
        [bytesTable()],
        { timeRange: { from: '2026-11-04T00:00:00.000Z', to: '2026-11-04T06:00:00.000Z' } },
        parsed
      )
    );
    // Lens's own edit path: the time range in rison under `_g`.
    expect(node.interactions?.link?.href).toBe(
      "/s/team/app/lens#/edit/abc?_g=(time:(from:'2026-11-04T00:00:00.000Z',to:'2026-11-04T06:00:00.000Z'))"
    );
  });

  it('throws for a column the query did not return', () => {
    expect(() =>
      map(esqlMetric({ metrics: [{ type: 'primary', column: 'nope' }] }), [bytesTable()])
    ).toThrow('The query returned no "nope" column.');
  });
});
