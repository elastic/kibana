/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColorCategories } from '@kbn/chart-expressions-common';
import { workoutColorForValue } from '@kbn/charts-plugin/public/services/palettes/helpers';
import type { ColorMapping } from '@kbn/coloring';
import { getColorFactory } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DataTableNode, TableScene, UnsupportedNode } from '@kbn/isomer';
import { resolveChart } from '@kbn/isomer';
import { fromColorMappingAPIToLensState } from '@kbn/lens-embeddable-utils/config_builder/transforms/coloring';
import { getPalettes } from '@kbn/palettes';
import chroma from 'chroma-js';
import type { MaterializeContext } from '../../../common';
import type { KitServices } from '../kit/create_kit';
import { createMaterializeKit } from '../kit/create_kit';
import { createTestKitServices } from '../kit/kit_services.mock';
import type { MaterializedNode } from '../nodes';
import { createNodeValidator } from '../validate_node';
import { esqlTable } from './__fixtures__/esql_table';
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

const asTable = (node: MaterializedNode): DataTableNode => {
  expect(node.type).toBe('dataTable');
  return node as DataTableNode;
};

const scene = (node: DataTableNode, scheme: 'light' | 'dark' = 'light') =>
  resolveChart(node, {
    scheme,
    size: { width: 600, height: 400 },
    locale: 'en',
    timeZone: 'UTC',
  }) as TableScene;

const hex = (color: string | undefined) => (color ? chroma(color).hex() : undefined);

const query = 'FROM logs | STATS count = COUNT(*), bytes = SUM(bytes) BY host, os';

const hostTable = () =>
  esqlTable(
    [
      { name: 'count', type: 'long' },
      { name: 'bytes', type: 'double' },
      { name: 'host', type: 'keyword' },
      { name: 'os', type: 'keyword' },
    ],
    [
      [3, 1200, 'web-01', 'linux'],
      [5, 400, 'web-02', 'linux'],
      [7, 3000, 'web-01', 'osx'],
      [1, 50, null, 'win'],
    ],
    query
  );

const tableConfig = (overrides: Record<string, unknown> = {}) => ({
  type: 'data_table',
  title: 'Traffic',
  data_source: { type: 'esql', query },
  rows: [{ column: 'host', label: 'Host' }],
  metrics: [{ column: 'count', label: 'Requests' }, { column: 'bytes' }],
  ...overrides,
});

describe('Lens data table mapping', () => {
  it('shows rows, then metrics, with their labels, and keeps the query columns it reads', async () => {
    const node = asTable(map(tableConfig(), [hostTable()]));
    expect(await validate(node)).toEqual([]);
    // Lens's API schema defaults alignments (rows left, metrics right), and its state keeps them.
    expect(node.columns).toEqual([
      { column: 'host', alignment: 'left' },
      { column: 'count', alignment: 'right' },
      { column: 'bytes', alignment: 'right' },
    ]);
    expect(node.data.columns.map(({ id, label, role }) => [id, label, role])).toEqual([
      ['host', 'Host', 'dimension'],
      ['count', 'Requests', 'metric'],
      ['bytes', 'bytes', 'metric'],
    ]);
    expect(node.interactions).toEqual({ select: ['cell'] });
    expect(node.losses).toBeUndefined();
  });

  it('carries widths, alignments, hidden columns, paging, density and the starting sort', async () => {
    const node = asTable(
      map(
        tableConfig({
          rows: [
            { column: 'host', width: 180, alignment: 'center' },
            { column: 'os', visible: false },
          ],
          metrics: [{ column: 'count' }, { column: 'bytes', alignment: 'left' }],
          styling: {
            paging: 20,
            density: { mode: 'compact' },
            sort_by: { column_type: 'metric', index: 1, direction: 'desc' },
          },
        }),
        [hostTable()]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node.columns).toEqual([
      { column: 'host', alignment: 'center', width: 180 },
      { column: 'count', alignment: 'right' },
      { column: 'bytes', alignment: 'left' },
    ]);
    // A hidden column stays in the data, as in Lens's table.
    expect(node.data.columns.map(({ id }) => id)).toContain('os');
    expect(node.pageSize).toBe(20);
    expect(node.density).toBe('compact');
    expect(node.interactions?.initial).toEqual({ sort: { column: 'bytes', direction: 'desc' } });
    const { columns } = scene(node);
    expect(columns.map(({ alignment }) => alignment)).toEqual(['center', 'right', 'left']);
  });

  it("labels summaries as Lens does, and computes them over the column's values", async () => {
    const node = asTable(
      map(
        tableConfig({
          metrics: [
            { column: 'count', summary: { type: 'sum' } },
            { column: 'bytes', summary: { type: 'count', label: 'Hosts' } },
          ],
        }),
        [hostTable()]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node.columns?.slice(1).map(({ summary }) => summary)).toEqual([
      { kind: 'sum', label: 'Sum' },
      { kind: 'count', label: 'Hosts' },
    ]);
    const footers = scene(node).columns.map(({ footer }) => footer);
    expect(footers.slice(1)).toEqual(['Sum: 16', 'Hosts: 4']);
  });

  it.each([
    [
      'absolute steps',
      {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { lt: 500, color: '#D23115' },
          { gte: 500, lt: 2000, color: '#FCC400' },
          { gte: 2000, color: '#68BC00' },
        ],
      },
    ],
    [
      'percentage steps',
      {
        type: 'dynamic',
        range: 'percentage',
        steps: [
          { gte: 0, lt: 40, color: '#D23115' },
          { gte: 40, lte: 100, color: '#68BC00' },
        ],
      },
    ],
    ['a named palette', { type: 'distributed_palette', palette: 'temperature' }],
    ['no palette: Lens’s default', undefined],
  ])('colors a numeric column by value, as Kibana does, with %s', async (_, configured) => {
    const color = configured as
      | {
          type: string;
          range?: string;
          palette?: string;
          steps?: Array<{ gte?: number; lt?: number; lte?: number; color: string }>;
        }
      | undefined;
    const config = tableConfig({
      metrics: [{ column: 'bytes', apply_color_to: 'background', ...(color ? { color } : {}) }],
    });
    const table = hostTable();
    const node = asTable(map(config, [table]));
    expect(await validate(node)).toEqual([]);
    expect(node.columns?.[1].decoration?.kind).toBe('background');

    // Kibana's own math: the palette state Lens's API transform builds, and `workoutColorForValue`.
    const values = table.rows.map((row) => row.bytes as number);
    const minMax = { min: Math.min(...values), max: Math.max(...values) };
    const palettes = getPalettes(false);
    const params = (() => {
      if (color?.type === 'dynamic' && color.steps) {
        const { steps } = color;
        const last = steps[steps.length - 1];
        const rangeMin = steps[0].gte ?? null;
        const rangeMax = last.lt ?? last.lte ?? null;
        return {
          colors: steps.map((step) => step.color),
          stops: steps.map((step) => step.lt ?? step.lte ?? null),
          range: color.range === 'percentage' ? 'percent' : 'number',
          rangeMin: rangeMin ?? -Infinity,
          rangeMax: rangeMax ?? Infinity,
          continuity:
            rangeMin === null && rangeMax === null
              ? 'all'
              : rangeMax === null
              ? 'above'
              : rangeMin === null
              ? 'below'
              : 'none',
        };
      }
      if (color) {
        return {
          colors: palettes.get(color.palette as string).colors(5),
          stops: [],
          range: 'percent',
          rangeMin: 0,
          rangeMax: 100,
          continuity: 'all',
        };
      }
      // `getColorByValuePalette`'s default: `positive`, stops every 20% (`getPaletteStops`).
      return {
        colors: palettes.get('positive').colors(5),
        stops: [20, 40, 60, 80, 100],
        range: 'percent',
        rangeMin: 0,
        rangeMax: 100,
        continuity: 'above',
      };
    })();
    const expected = values.map((value) =>
      hex(workoutColorForValue(value, params as never, minMax))
    );
    const drawn = scene(node).rows.map(({ cells }) => hex(cells[1].background));
    expect(drawn).toEqual(expected);
  });

  it("colors a text column by term, through Lens's color mapping", async () => {
    const color = {
      mode: 'categorical',
      palette: 'default',
      mapping: [{ values: ['web-02'], color: { type: 'color_code', value: '#FF0000' } }],
    };
    const config = tableConfig({ rows: [{ column: 'host', apply_color_to: 'value', color }] });
    const table = hostTable();
    const node = asTable(map(config, [table]));
    expect(await validate(node)).toEqual([]);

    const { colorMapping } = fromColorMappingAPIToLensState(color as never) as {
      colorMapping: ColorMapping.Config;
    };
    const categories = getColorCategories(table.rows, ['host'], [null]);
    const light = getColorFactory(colorMapping, getPalettes(false), false, {
      type: 'categories',
      categories,
    });
    expect(node.columns?.[0].decoration).toEqual({
      kind: 'text',
      colors: {
        byKey: Object.fromEntries(
          ['web-01', 'web-02'].map((host) => [
            host,
            expect.objectContaining({ light: chroma(light(host)).hex() }),
          ])
        ),
      },
    });
    const drawn = scene(node).rows.map(({ cells }) => hex(cells[0].color));
    expect(drawn[1]).toBe('#ff0000');
    expect(drawn[3]).not.toBe('#ff0000');
  });

  it('collapses a row as Lens does, folding the metrics over the other rows', async () => {
    const node = asTable(
      map(
        tableConfig({
          rows: [{ column: 'host' }, { column: 'os', collapse_by: 'sum' }],
          metrics: [{ column: 'count' }],
        }),
        [hostTable()]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node.columns?.map(({ column }) => column)).toEqual(['host', 'count']);
    expect(node.data.rows).toEqual([
      ['web-01', 10],
      ['web-02', 5],
      [null, 1],
    ]);
  });

  it('records what it cannot draw', async () => {
    const node = asTable(
      map(
        tableConfig({
          styling: {
            row_numbers: { visible: true },
            density: { height: { value: { type: 'custom', lines: 3 }, header: { type: 'auto' } } },
          },
        }),
        [hostTable()]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node.losses?.map(({ path, kind }) => [path, kind])).toEqual([
      ['styling.density.height.value', 'dropped'],
      ['styling.density.height.header', 'dropped'],
      ['styling.row_numbers', 'dropped'],
    ]);
  });

  it('is unsupported when it pivots metrics into columns', () => {
    const node = map(tableConfig({ split_metrics_by: [{ column: 'os' }] }), [hostTable()]);
    expect((node as UnsupportedNode).reason).toBe(
      'Data tables that split their metrics into columns cannot be materialized yet.'
    );
  });
});
