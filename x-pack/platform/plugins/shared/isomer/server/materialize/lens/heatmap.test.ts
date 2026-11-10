/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { HeatmapNode, HeatmapScene } from '@kbn/isomer';
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

const asHeatmap = (node: MaterializedNode): HeatmapNode => {
  expect(node.type).toBe('heatmap');
  return node as HeatmapNode;
};

const scene = (node: HeatmapNode) =>
  resolveChart(node, {
    scheme: 'light',
    size: { width: 600, height: 400 },
    locale: 'en',
    timeZone: 'UTC',
  }) as HeatmapScene;

const query =
  'FROM logs | STATS count = COUNT(*) BY hour = BUCKET(@timestamp, 1 hour), host | SORT hour';

const hourTable = () =>
  esqlTable(
    [
      { name: 'count', type: 'long' },
      { name: 'hour', type: 'date' },
      { name: 'host', type: 'keyword' },
    ],
    [
      [0, '2026-11-04T00:00:00.000Z', 'web-01'],
      [25, '2026-11-04T00:00:00.000Z', 'web-02'],
      [50, '2026-11-04T01:00:00.000Z', 'web-01'],
      [75, '2026-11-04T01:00:00.000Z', 'web-02'],
      [100, '2026-11-04T02:00:00.000Z', 'web-01'],
    ],
    query
  );

const heatmapConfig = (overrides: Record<string, unknown> = {}) => ({
  type: 'heatmap',
  title: 'Requests per hour',
  data_source: { type: 'esql', query },
  x: { column: 'hour' },
  y: { column: 'host', label: 'Host' },
  metric: { column: 'count', label: 'Requests' },
  ...overrides,
});

const hex = (color: string) => chroma(color).hex();

describe('Lens heat map mapping', () => {
  it("maps the axes, a time x axis's brush, and Lens's defaults", async () => {
    const node = asHeatmap(map(heatmapConfig(), [hourTable()]));
    expect(await validate(node)).toEqual([]);
    expect(node).toMatchObject({
      x: { column: 'hour' },
      y: { column: 'host' },
      value: { column: 'count' },
      interactions: { select: ['cell'], brush: { column: 'hour' } },
    });
    // Lens hides axis titles unless asked (`isXAxisTitleVisible: false`), and its default
    // palette is the node's own: no bands, no cell labels.
    expect(node.axes).toBeUndefined();
    expect(node.colors).toBeUndefined();
    expect(node.cellLabels).toBeUndefined();

    // `temperature` in 5 equal steps over the values, as Lens's default palette spreads it.
    const temperature = getPalettes(false).get('temperature').colors(5).map(hex);
    const cells = scene(node).cells.map(({ value, color }) => [value, hex(color)]);
    expect(cells).toEqual([
      [0, temperature[0]],
      [25, temperature[1]],
      [50, temperature[2]],
      [75, temperature[3]],
      [100, temperature[4]],
    ]);
  });

  it('maps titles, labels, sorting, legend, cell labels and color bands', async () => {
    const node = asHeatmap(
      map(
        heatmapConfig({
          axis: {
            x: {
              title: { visible: true },
              labels: { orientation: 'vertical' },
              sort: 'desc',
              scale: 'temporal',
            },
            y: {
              title: { visible: true, text: 'Server' },
              labels: { visible: false },
              sort: 'asc',
            },
          },
          legend: { visibility: 'visible', position: 'bottom', truncate_after_lines: 2 },
          styling: { cells: { labels: { visible: true } } },
          metric: {
            column: 'count',
            color: {
              type: 'dynamic',
              range: 'percentage',
              steps: [
                { lt: 50, color: '#00FF00' },
                { gte: 50, color: '#FF0000' },
              ],
            },
          },
        }),
        [hourTable()]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node).toMatchObject({
      x: { column: 'hour', sort: 'desc' },
      y: { column: 'host', sort: 'asc' },
      axes: {
        x: { title: 'hour', labelOrientation: 'vertical' },
        y: { title: 'Server', labels: false },
      },
      legend: { visibility: 'visible', position: 'bottom', maxLines: 2 },
      cellLabels: true,
      bandsRange: 'percentage',
      colors: {
        bands: [
          { to: 50, color: { light: '#00ff00', dark: '#00ff00' } },
          { from: 50, color: { light: '#ff0000', dark: '#ff0000' } },
        ],
      },
    });
    const colors = scene(node).cells.map(({ color }) => hex(color));
    expect(colors).toEqual(['#00ff00', '#00ff00', '#ff0000', '#ff0000', '#ff0000']);
  });

  it('keeps the first of two rows for the same cell, and says so', async () => {
    const table = hourTable();
    const node = asHeatmap(
      map(heatmapConfig(), [{ ...table, rows: [...table.rows, { ...table.rows[0], count: 9 }] }])
    );
    expect(await validate(node)).toEqual([]);
    expect(node.data.rows).toHaveLength(5);
    expect(node.losses?.map(({ path }) => path)).toEqual(['data.rows']);
  });
});
