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
import type { TagCloudNode, TagCloudScene } from '@kbn/isomer';
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

const asTagCloud = (node: MaterializedNode): TagCloudNode => {
  expect(node.type).toBe('tagCloud');
  return node as TagCloudNode;
};

const scene = (node: TagCloudNode) =>
  resolveChart(node, {
    scheme: 'light',
    size: { width: 600, height: 400 },
    locale: 'en',
    timeZone: 'UTC',
  }) as TagCloudScene;

const query = 'FROM logs | STATS count = COUNT(*) BY tag';

const tagTable = () =>
  esqlTable(
    [
      { name: 'count', type: 'long' },
      { name: 'tag', type: 'keyword' },
    ],
    [
      [30, 'success'],
      [12, 'info'],
      [5, 'warning'],
      [1, 'error'],
    ],
    query
  );

const tagConfig = (overrides: Record<string, unknown> = {}) => ({
  type: 'tag_cloud',
  title: 'Tags',
  data_source: { type: 'esql', query },
  metric: { column: 'count' },
  tag_by: { column: 'tag' },
  ...overrides,
});

const hex = (color: string) => chroma(color).hex();

describe('Lens tag cloud mapping', () => {
  it("maps Lens's defaults, coloring each tag by its row in the default palette", async () => {
    const table = tagTable();
    const node = asTagCloud(map(tagConfig(), [table]));
    expect(await validate(node)).toEqual([]);
    expect(node).toMatchObject({
      tags: { column: 'tag' },
      metric: { column: 'count' },
      fontSize: { min: 18, max: 72 },
      interactions: { select: ['tag'] },
    });
    expect(node.orientation).toBeUndefined();
    expect(node.scale).toBeUndefined();
    expect(node.showLabel).toBeUndefined();

    // Lens's legacy `getColor`: the `default` palette at the tag's row out of every row.
    const palette = getPalettes(false).get('default');
    const words = scene(node).words.map(({ text, color }) => [text, hex(color)]);
    expect(words).toEqual(
      table.rows.map((row, index) => [row.tag, hex(palette.getColor(index, table.rows.length))])
    );
  });

  it('maps orientation, font sizes, the caption and a color mapping', async () => {
    const color = {
      mode: 'categorical',
      palette: 'default',
      mapping: [{ values: ['error'], color: { type: 'color_code', value: '#FF0000' } }],
    };
    const table = tagTable();
    const node = asTagCloud(
      map(
        tagConfig({
          tag_by: { column: 'tag', color },
          styling: {
            orientation: 'angled',
            font_size: { min: 10, max: 40 },
            caption: { visible: false },
          },
        }),
        [table]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node).toMatchObject({
      orientation: 'multiple',
      fontSize: { min: 10, max: 40 },
      showLabel: false,
    });
    const { colorMapping } = fromColorMappingAPIToLensState(color as never) as {
      colorMapping: ColorMapping.Config;
    };
    const getColor = getColorFactory(colorMapping, getPalettes(false), false, {
      type: 'categories',
      categories: getColorCategories(table.rows, ['tag']),
    });
    const words = scene(node).words.map(({ text, color: drawn }) => [text, hex(drawn)]);
    expect(words).toEqual(table.rows.map((row) => [row.tag, hex(getColor(row.tag))]));
    expect(words[3][1]).toBe('#ff0000');
  });

  it.each([
    ['vertical', 'rightAngled'],
    ['horizontal', undefined],
  ])('maps the %s orientation', (orientation, expected) => {
    const node = asTagCloud(map(tagConfig({ styling: { orientation } }), [tagTable()]));
    expect(node.orientation).toBe(expected);
  });
});
