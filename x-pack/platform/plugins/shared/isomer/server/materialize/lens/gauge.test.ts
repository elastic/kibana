/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import {
  getMaxValue,
  getMinValue,
} from '@kbn/expression-gauge-plugin/public/components/utils/accessors';
import type { GaugeNode, GaugeScene } from '@kbn/isomer';
import { resolveChart } from '@kbn/isomer';
import { getPalettes } from '@kbn/palettes';
import chroma from 'chroma-js';
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

const map = (config: unknown, tables: Datatable[]) =>
  materializer.map(
    materializer.parse(config),
    { tables, nodes: [] },
    createMaterializeKit(services, {})
  );

const asGauge = (node: MaterializedNode): GaugeNode => {
  expect(node.type).toBe('gauge');
  return node as GaugeNode;
};

const scene = (node: GaugeNode) =>
  resolveChart(node, {
    scheme: 'light',
    size: { width: 400, height: 300 },
    locale: 'en',
    timeZone: 'UTC',
  }) as GaugeScene;

const query = 'FROM logs | STATS load = AVG(load), ceiling = MAX(load), target = 70';

const loadTable = (rows: unknown[][] = [[42, 120, 70]]) =>
  esqlTable(
    [
      { name: 'load', type: 'double' },
      { name: 'ceiling', type: 'double' },
      { name: 'target', type: 'integer' },
    ],
    rows,
    query
  );

const gaugeConfig = (
  metric: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {}
) => ({
  type: 'gauge',
  title: 'Load',
  data_source: { type: 'esql', query },
  metric: { column: 'load', label: 'Load', ...metric },
  ...overrides,
});

const hex = (color: string) => chroma(color).hex();

describe('Lens gauge mapping', () => {
  it("draws Lens's defaults: a horizontal bullet, `status` in 4 steps, ticks at the bands", async () => {
    const table = loadTable();
    const node = asGauge(map(gaugeConfig(), [table]));
    expect(await validate(node)).toEqual([]);
    expect(node).toMatchObject({
      shape: 'horizontalBullet',
      ticks: 'bands',
      bandsRange: 'percentage',
    });

    const resolved = scene(node);
    // The scale's bounds as Kibana's gauge works them out with no min or max column.
    const row = table.rows[0];
    const accessors = { metric: 'load' };
    expect([resolved.min, resolved.max]).toEqual([
      getMinValue(row, accessors),
      getMaxValue(row, accessors),
    ]);
    // `normalizeBands` for a named palette: equal sections from min to max.
    const step = (resolved.max - resolved.min) / 4;
    const status = getPalettes(false).get('status').colors(4).map(hex);
    expect(resolved.bands.map(({ start, end, color }) => [start, end, hex(color)])).toEqual(
      status.map((color, index) => [
        resolved.min + index * step,
        resolved.min + (index + 1) * step,
        color,
      ])
    );
    expect(resolved.labels.major).toBe('Load');
  });

  it.each([
    [{ type: 'bullet', orientation: 'vertical' }, 'verticalBullet'],
    [{ type: 'semi_circle' }, 'semiCircle'],
    [{ type: 'arc' }, 'arc'],
    [{ type: 'circle' }, 'circle'],
  ])('maps the %j shape', async (shape, expected) => {
    const node = asGauge(map(gaugeConfig({}, { styling: { shape } }), [loadTable()]));
    expect(await validate(node)).toEqual([]);
    expect(node.shape).toBe(expected);
  });

  it('maps min, max, goal, steps, labels and ticks', async () => {
    const node = asGauge(
      map(
        gaugeConfig({
          min: { column: 'target' },
          max: { column: 'ceiling' },
          goal: { column: 'target' },
          title: { text: 'CPU load' },
          subtitle: 'last hour',
          ticks: { mode: 'auto' },
          color: {
            type: 'dynamic',
            range: 'absolute',
            steps: [
              { gte: 0, lt: 80, color: '#00FF00' },
              { gte: 80, color: '#FF0000' },
            ],
          },
        }),
        [loadTable()]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node).toMatchObject({
      min: { column: 'target' },
      max: { column: 'ceiling' },
      goal: { column: 'target' },
      labels: { major: 'CPU load', minor: 'last hour' },
      colors: { bands: [{ from: 0, to: 80 }, { from: 80 }] },
    });
    expect(node.ticks).toBeUndefined();
    expect(node.bandsRange).toBeUndefined();
  });

  it('leaves the scale uncolored for `none`, hides ticks and the title, and reads one row', async () => {
    const node = asGauge(
      map(
        gaugeConfig({
          color: { type: 'none' },
          ticks: { visible: false },
          title: { visible: false },
        }),
        [
          loadTable([
            [42, 120, 70],
            [7, 8, 9],
          ]),
        ]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node.colors).toBeUndefined();
    expect(node.ticks).toBe('hidden');
    expect(node.labels).toEqual({ major: false });
    expect(node.data.rows).toEqual([[42]]);
    expect(node.losses?.map(({ path }) => path)).toEqual(['data.rows']);
  });
});
