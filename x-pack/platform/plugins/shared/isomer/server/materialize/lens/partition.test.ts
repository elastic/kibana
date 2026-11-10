/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getColorCategories } from '@kbn/chart-expressions-common';
import type { ColorMapping } from '@kbn/coloring';
import { getColorFactory } from '@kbn/coloring';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { PartitionChartNode, PartitionScene } from '@kbn/isomer';
import { resolveChart } from '@kbn/isomer';
import { fromColorMappingAPIToLensState } from '@kbn/lens-embeddable-utils/config_builder/transforms/coloring';
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

const asPartition = (node: MaterializedNode): PartitionChartNode => {
  expect(node.type).toBe('partitionChart');
  return node as PartitionChartNode;
};

const scene = (node: PartitionChartNode) =>
  resolveChart(node, {
    scheme: 'light',
    size: { width: 600, height: 400 },
    locale: 'en',
    timeZone: 'UTC',
  }) as PartitionScene;

const query = 'FROM logs | STATS count = COUNT(*), bytes = SUM(bytes) BY os, host';

const osTable = () =>
  esqlTable(
    [
      { name: 'count', type: 'long' },
      { name: 'bytes', type: 'double' },
      { name: 'os', type: 'keyword' },
      { name: 'host', type: 'keyword' },
    ],
    [
      [3, 1200, 'linux', 'web-01'],
      [5, 400, 'osx', 'web-01'],
      [7, 3000, 'linux', 'web-02'],
      [1, 50, null, 'web-02'],
    ],
    query
  );

const color = {
  mode: 'categorical',
  palette: 'default',
  mapping: [{ values: ['osx'], color: { type: 'color_code', value: '#FF0000' } }],
};

/** The colors Kibana's color mapping gives the column's categories, light mode. */
const kibanaColors = (table: Datatable, column: string) => {
  const { colorMapping } = fromColorMappingAPIToLensState(color as never) as {
    colorMapping: ColorMapping.Config;
  };
  const categories = getColorCategories(table.rows, [column]);
  const getColor = getColorFactory(colorMapping, getPalettes(false), false, {
    type: 'categories',
    categories,
  });
  return categories.map((category) => [String(category), chroma(getColor(category)).hex()]);
};

/** The color Kibana's color mapping gives `value` among the column's categories, light mode. */
const kibanaColor = (table: Datatable, column: string, value: string) => {
  const { colorMapping } = fromColorMappingAPIToLensState(color as never) as {
    colorMapping: ColorMapping.Config;
  };
  return chroma(
    getColorFactory(colorMapping, getPalettes(false), false, {
      type: 'categories',
      categories: getColorCategories(table.rows, [column]),
    })(value)
  ).hex();
};

const lightColors = (node: PartitionChartNode) =>
  Object.entries(node.colors?.byKey ?? {}).map(([key, value]) => [
    key,
    'light' in value ? value.light.toLowerCase() : value,
  ]);

const esql = { type: 'esql', query };

describe('Lens partition mapping', () => {
  it('maps a pie: groups, labels, legend and the colors of its color mapping', async () => {
    const table = osTable();
    const node = asPartition(
      map(
        {
          type: 'pie',
          title: 'Requests by OS',
          data_source: esql,
          metrics: [{ column: 'count', label: 'Requests' }],
          group_by: [{ column: 'os', color }, { column: 'host' }],
          legend: {
            visibility: 'visible',
            position: 'bottom',
            nested: true,
            truncate_after_lines: 2,
          },
          styling: {
            labels: { position: 'inside' },
            values: { mode: 'absolute', percent_decimals: 1 },
          },
        },
        [table]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node).toMatchObject({
      shape: 'pie',
      metrics: [{ column: 'count' }],
      groups: [{ column: 'os' }, { column: 'host' }],
      labels: { categories: 'inside', values: 'value', percentDecimals: 1 },
      legend: { visibility: 'visible', position: 'bottom', nested: true, maxLines: 2 },
      interactions: { select: ['slice'] },
    });
    expect(node.donutHole).toBeUndefined();
    // The outermost group is colored. Lens looks slices up by their text, so the null category
    // (keyed `\null`) takes the unassigned color, as `"null"` does.
    expect(lightColors(node)).toEqual(
      kibanaColors(table, 'os').map(([key, hex]) =>
        key === 'null' ? ['\\null', kibanaColor(table, 'os', 'null')] : [key, hex]
      )
    );
    const { nodes } = scene(node);
    expect(nodes.map(({ label }) => label).sort()).toEqual(['(null)', 'linux', 'osx']);
  });

  it.each([
    ['s', 0.3],
    ['m', 0.54],
    ['l', 0.7],
  ])('draws a pie with a %s donut hole as a donut with Lens’s radius', async (hole, ratio) => {
    const node = asPartition(
      map(
        {
          type: 'pie',
          data_source: esql,
          metrics: [{ column: 'count' }],
          group_by: [{ column: 'os' }],
          styling: { donut_hole: hole },
        },
        [osTable()]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node.shape).toBe('donut');
    expect(node.donutHole).toBe(ratio);
  });

  it("puts a mosaic's breakdown outside, as Lens flips them, and colors by its group_by", async () => {
    const table = osTable();
    const node = asPartition(
      map(
        {
          type: 'mosaic',
          data_source: esql,
          metric: { column: 'count' },
          group_by: [{ column: 'host', color }],
          group_breakdown_by: [{ column: 'os' }],
        },
        [table]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node.groups).toEqual([{ column: 'os' }, { column: 'host' }]);
    expect(lightColors(node)).toEqual(kibanaColors(table, 'host'));
  });

  it('maps a treemap and a waffle with Lens’s legend values', async () => {
    const treemap = asPartition(
      map(
        {
          type: 'treemap',
          data_source: esql,
          metrics: [{ column: 'bytes' }],
          group_by: [{ column: 'os' }, { column: 'host' }],
          styling: { labels: { visible: false }, values: { visible: false } },
        },
        [osTable()]
      )
    );
    expect(await validate(treemap)).toEqual([]);
    expect(treemap).toMatchObject({
      shape: 'treemap',
      labels: { categories: 'hidden', values: 'hidden' },
    });

    const waffle = (legend?: unknown) =>
      asPartition(
        map(
          {
            type: 'waffle',
            data_source: esql,
            metrics: [{ column: 'count' }],
            group_by: [{ column: 'os' }],
            ...(legend ? { legend } : {}),
          },
          [osTable()]
        )
      );
    expect(await validate(waffle())).toEqual([]);
    expect(waffle().legend).toEqual({ values: false });
    // Once a legend is given, Lens's schema fills its defaults, which match the node's.
    expect(waffle({ values: ['absolute'] }).legend).toEqual({ maxLines: 1, position: 'right' });
  });

  it('collapses a group, and colors metric slices by their static colors', async () => {
    const node = asPartition(
      map(
        {
          type: 'pie',
          data_source: esql,
          metrics: [
            { column: 'count', color: { type: 'static', color: '#00FF00' } },
            { column: 'bytes' },
          ],
          group_by: [{ column: 'host', collapse_by: 'sum' }],
        },
        [osTable()]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node.groups).toBeUndefined();
    expect(node.data.rows).toEqual([[16, 4650]]);
    expect(node.colors?.byKey?.count).toEqual({ light: '#00ff00', dark: '#00ff00' });
    expect(node.colors?.byKey?.bytes).toBeDefined();
    expect(node.interactions).toBeUndefined();
  });
});
