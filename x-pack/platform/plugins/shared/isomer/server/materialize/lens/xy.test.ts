/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColorCategories } from '@kbn/chart-expressions-common';
import type { ColorMapping } from '@kbn/coloring';
import { getColorFactory } from '@kbn/coloring';
import {
  getDefaultAnnotationColor,
  getDefaultAnnotationRangeColor,
} from '@kbn/event-annotation-common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { XyChartNode } from '@kbn/isomer';
import { fromColorMappingAPIToLensState } from '@kbn/lens-embeddable-utils/config_builder/transforms/coloring';
import { xyConfigSchemaESQL } from '@kbn/lens-embeddable-utils';
import { KbnPalette, getPalettes } from '@kbn/palettes';
import type { MaterializeContext } from '../../../common';
import type { KitServices } from '../kit/create_kit';
import { createMaterializeKit } from '../kit/create_kit';
import { createTestKitServices } from '../kit/kit_services.mock';
import type { MaterializedNode } from '../nodes';
import { createNodeValidator } from '../validate_node';
import { corpusCases } from './__fixtures__/corpus_cases';
import { corpusTable, esqlTable } from './__fixtures__/esql_table';
import { createLensMaterializer } from './materializer';

const validate = createNodeValidator();
const materializer = createLensMaterializer({
  getTransformOut: () => undefined,
  basePath: { get: () => '' },
});

let services: KitServices;
beforeAll(async () => {
  services = await createTestKitServices({ 'dateFormat:tz': 'UTC' });
});

const map = (config: unknown, tables: Datatable[], context: MaterializeContext = {}) =>
  materializer.map(
    materializer.parse(config),
    { tables, nodes: [] },
    createMaterializeKit(services, context)
  );

type ColorValue = NonNullable<NonNullable<XyChartNode['colors']>['byKey']>[string];
/** A data color, which materialization always makes concrete. */
const concrete = (color: ColorValue | undefined) => {
  if (color && !('light' in color)) {
    throw new Error('Not a concrete color.');
  }
  return color;
};

const asXy = (node: MaterializedNode): XyChartNode => {
  expect(node.type).toBe('xyChart');
  return node as XyChartNode;
};

const dataLayers = (node: XyChartNode) =>
  node.layers.filter(
    (layer): layer is Extract<XyChartNode['layers'][number], { kind: 'data' }> =>
      layer.kind === 'data'
  );

const query = 'FROM logs | STATS count = COUNT(*) BY host, day = BUCKET(@timestamp, 1 hour)';

const xyConfig = (layers: unknown[], overrides: Record<string, unknown> = {}) => ({
  type: 'xy',
  title: 'Requests',
  layers,
  ...overrides,
});

const hostTable = () =>
  esqlTable(
    [
      { name: 'count', type: 'long' },
      { name: 'host', type: 'keyword' },
      { name: 'day', type: 'date' },
    ],
    [
      [3, 'web-02', '2026-11-04T00:00:00.000Z'],
      [5, 'web-01', '2026-11-04T00:00:00.000Z'],
      [7, 'web-02', '2026-11-04T01:00:00.000Z'],
      [1, null, '2026-11-04T01:00:00.000Z'],
    ],
    query
  );

const dataLayer = (overrides: Record<string, unknown> = {}) => ({
  type: 'line',
  data_source: { type: 'esql', query },
  x: { column: 'day' },
  y: [{ column: 'count' }],
  ...overrides,
});

describe('Lens xy mapping, against the corpus', () => {
  it.each(['logsBytesDistribution', 'tagsHorizontal', 'hugePerDay'])(
    'draws %s with the series colors and axis titles Kibana drew',
    async (name) => {
      const { config, light, dark } = corpusCases[name];
      const node = asXy(map(config, [corpusTable(name)]));
      expect(await validate(node)).toEqual([]);

      const [layer] = dataLayers(node);
      const lower = (color?: { light: string; dark: string }) =>
        color && { light: color.light.toLowerCase(), dark: color.dark.toLowerCase() };
      expect(
        layer.y.map(({ column, color }) => [
          node.data.columns.find(({ id }) => id === column)?.label,
          lower(concrete(color)),
        ])
      ).toEqual(
        light.series?.map(({ name: series, color }, index) => [
          series,
          { light: color, dark: dark.series?.[index].color },
        ])
      );
      expect(node.axes?.x?.title).toBe(light.axisTitles?.x[0]);
      expect(node.axes?.y?.title).toBe(light.axisTitles?.y[0]);
    }
  );

  it('maps the stacked bars of the bytes distribution', () => {
    const node = asXy(
      map(corpusCases.logsBytesDistribution.config, [corpusTable('logsBytesDistribution')])
    );
    expect(dataLayers(node)).toEqual([
      expect.objectContaining({ mark: 'bar', stack: 'stacked', x: 'bytes' }),
    ]);
    expect(node.orientation).toBeUndefined();
    expect(node.legend).toMatchObject({
      visibility: 'auto',
      position: 'right',
      layout: 'grid',
      maxLines: 1,
    });
    expect(node.data.columns.find(({ id }) => id === 'percentage')?.format).toMatchObject({
      kind: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  });

  it('turns horizontal bars into a horizontal chart', () => {
    const node = asXy(map(corpusCases.tagsHorizontal.config, [corpusTable('tagsHorizontal')]));
    expect(node.orientation).toBe('horizontal');
    expect(dataLayers(node)[0]).toMatchObject({ mark: 'bar', x: 'tags' });
    expect(node.interactions).toEqual({ select: ['datum'] });
  });

  it('lets a reader brush a date x axis', () => {
    const node = asXy(map(corpusCases.hugePerDay.config, [corpusTable('hugePerDay')]));
    expect(node.interactions?.brush).toEqual({ column: 'day' });
    expect(node.axes?.x?.scale).toBe('ordinal');
    expect(node.data.columns.map(({ id, role }) => [id, role])).toEqual([
      ['total', 'metric'],
      ['day', 'dimension'],
    ]);
  });
});

describe('Lens xy mapping', () => {
  it("colors each split value as Kibana's color mapping does", async () => {
    const color = {
      mode: 'categorical',
      palette: 'default',
      mapping: [{ values: ['web-01'], color: { type: 'color_code', value: '#FF0000' } }],
    };
    const config = xyConfig([dataLayer({ breakdown_by: { column: 'host', color } })]);
    const table = hostTable();
    const node = asXy(map(config, [table]));
    expect(await validate(node)).toEqual([]);

    const parsed = xyConfigSchemaESQL.parse(config);
    const parsedColor = (parsed.layers[0] as { breakdown_by: { color: unknown } }).breakdown_by
      .color;
    const state = fromColorMappingAPIToLensState(
      parsedColor as Parameters<typeof fromColorMappingAPIToLensState>[0]
    );
    const mapping = (state as { colorMapping: ColorMapping.Config }).colorMapping;
    const categories = getColorCategories(table.rows, ['host']);
    const light = getColorFactory(mapping, getPalettes(false), false, {
      type: 'categories',
      categories,
    });
    const dark = getColorFactory(mapping, getPalettes(true), true, {
      type: 'categories',
      categories,
    });

    expect(node.colors?.byKey).toEqual(
      Object.fromEntries(
        ['web-02', 'web-01', null].map((host) => [
          String(host),
          { light: light(host).toLowerCase(), dark: dark(host).toLowerCase() },
        ])
      )
    );
    expect(dataLayers(node)[0]).toMatchObject({ splitBy: 'host' });
    expect(node.interactions?.select).toEqual(['datum', 'series', 'legend']);
  });

  it("colors an unsplit line with Lens's line palette", () => {
    const node = asXy(
      map(
        xyConfig([dataLayer({ y: [{ column: 'count' }, { column: 'count', label: 'Again' }] })]),
        [hostTable()]
      )
    );
    const palette = getPalettes(false).get(KbnPalette.ElasticLineOptimized);
    expect(dataLayers(node)[0].y.map(({ color }) => concrete(color)?.light.toLowerCase())).toEqual([
      palette.getColor(0, 2).toLowerCase(),
      palette.getColor(1, 2).toLowerCase(),
    ]);
    expect(palette.getColor(1, 2)).not.toBe(
      getPalettes(false).get(KbnPalette.Default).getColor(1, 2)
    );
  });

  it('keeps a static series color', () => {
    const node = asXy(
      map(
        xyConfig([
          dataLayer({ y: [{ column: 'count', color: { type: 'static', color: '#00FF00' } }] }),
        ]),
        [hostTable()]
      )
    );
    expect(dataLayers(node)[0].y[0].color).toEqual({ light: '#00ff00', dark: '#00ff00' });
  });

  it('titles the axes from the first series on each, as Lens does', () => {
    const node = asXy(
      map(
        xyConfig([dataLayer({ y: [{ column: 'count', label: 'Requests' }] })], {
          axis: { x: { title: { visible: false } }, y: { title: { visible: true } } },
        }),
        [hostTable()]
      )
    );
    expect(node.axes?.x?.title).toBeUndefined();
    expect(node.axes?.y?.title).toBe('Requests');
    expect(node.data.columns.find(({ id }) => id === 'count')?.label).toBe('Requests');
  });

  it('appends layers from separate queries, sharing x and renaming the other columns', async () => {
    const second = esqlTable(
      [
        { name: 'count', type: 'long' },
        { name: 'day', type: 'date' },
      ],
      [[9, '2026-11-04T00:00:00.000Z']],
      'FROM other'
    );
    const config = xyConfig([
      dataLayer({ type: 'bar' }),
      dataLayer({ type: 'line', data_source: { type: 'esql', query: 'FROM other' } }),
    ]);
    const node = asXy(map(config, [hostTable(), second]));
    expect(await validate(node)).toEqual([]);
    expect(node.data.columns.map(({ id }) => id)).toEqual(['count', 'host', 'day', 'count (2)']);
    expect(node.data.rows).toHaveLength(5);
    expect(node.data.rows[4]).toEqual([null, null, '2026-11-04T00:00:00.000Z', 9]);
    expect(dataLayers(node).map(({ rows, x, y }) => ({ rows, x, y: y[0].column }))).toEqual([
      { rows: [0, 4], x: 'day', y: 'count' },
      { rows: [4, 5], x: 'day', y: 'count (2)' },
    ]);
  });

  it("states the x bucket width from the query's BUCKET, as Lens's minInterval does", async () => {
    const bucketed = esqlTable(
      [
        { name: 'count', type: 'long' },
        { name: 'day', type: 'date', _meta: { bucket: { interval: 1, unit: 'hour' } } },
      ] as Array<{ name: string; type: string }>,
      [
        [3, '2026-11-04T00:00:00.000Z'],
        [7, '2026-11-04T01:00:00.000Z'],
      ]
    );
    const node = asXy(map(xyConfig([dataLayer()]), [bucketed]));
    expect(await validate(node)).toEqual([]);
    expect(node.axes?.x?.interval).toBe(3_600_000);
    expect(asXy(map(xyConfig([dataLayer()]), [hostTable()])).axes?.x).not.toHaveProperty(
      'interval'
    );
  });

  it('draws static and queried reference lines', async () => {
    const config = xyConfig([
      dataLayer(),
      {
        type: 'reference_lines',
        data_source: { type: 'data_view_reference', ref_id: 'unused' },
        thresholds: [{ operation: 'static_value', value: 4, label: 'Goal', axis: 'y' }],
      },
      {
        type: 'reference_lines',
        data_source: { type: 'esql', query: 'FROM logs | STATS limit = MAX(count)' },
        thresholds: [{ column: 'limit', text: { visible: true } }],
      },
    ]);
    const limits = esqlTable([{ name: 'limit', type: 'long' }], [[8]]);
    const node = asXy(map(config, [hostTable(), limits]));
    expect(await validate(node)).toEqual([]);
    const lines = node.layers.filter(({ kind }) => kind === 'referenceLines');
    expect(lines).toEqual([
      {
        kind: 'referenceLines',
        lines: [expect.objectContaining({ value: 4, label: 'Goal', axis: 'y' })],
      },
      {
        kind: 'referenceLines',
        lines: [expect.objectContaining({ value: 8, label: 'limit', showText: true })],
      },
    ]);
  });

  it("gives annotations Kibana's default annotation colors", async () => {
    const config = xyConfig([
      dataLayer(),
      {
        type: 'annotations',
        events: [
          {
            type: 'point',
            timestamp: '2026-11-04T00:30:00.000Z',
            label: 'Deploy',
            text: { visible: true },
          },
          { type: 'range', interval: { from: 1, to: 2 } },
        ],
      },
    ]);
    const node = asXy(map(config, [hostTable()]));
    expect(await validate(node)).toEqual([]);
    const annotations = node.layers.find(({ kind }) => kind === 'annotations');
    expect(annotations).toEqual({
      kind: 'annotations',
      events: [
        {
          kind: 'point',
          at: Date.parse('2026-11-04T00:30:00.000Z'),
          label: 'Deploy',
          text: 'Deploy',
          color: {
            light: getDefaultAnnotationColor(false).toLowerCase(),
            dark: getDefaultAnnotationColor(true).toLowerCase(),
          },
        },
        expect.objectContaining({
          kind: 'range',
          from: 1,
          to: 2,
          color: expect.objectContaining({
            light: getDefaultAnnotationRangeColor(false).toLowerCase(),
          }),
        }),
      ],
    });
  });

  it("collapses a breakdown with Lens's collapse function", async () => {
    const config = xyConfig([dataLayer({ breakdown_by: { column: 'host', collapse_by: 'sum' } })]);
    const node = asXy(map(config, [hostTable()]));
    expect(await validate(node)).toEqual([]);
    expect(node.data.columns.map(({ id }) => id)).toEqual(['count', 'day']);
    expect(node.data.rows.map(([count]) => count)).toEqual([8, 8]);
    expect(dataLayers(node)[0].splitBy).toBeUndefined();
  });
});
