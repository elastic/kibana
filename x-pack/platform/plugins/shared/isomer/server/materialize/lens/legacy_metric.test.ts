/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { workoutColorForValue } from '@kbn/charts-plugin/public/services/palettes/helpers';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { getLegacyMetricDataBounds } from '@kbn/expression-legacy-metric-vis-plugin/public/utils/palette';
import type { LegacyMetricNode, LegacyMetricScene } from '@kbn/isomer';
import { resolveChart } from '@kbn/isomer';
import { getPalettes } from '@kbn/palettes';
import chroma from 'chroma-js';
import type { KitServices } from '../kit/create_kit';
import { createMaterializeKit } from '../kit/create_kit';
import { createTestKitServices } from '../kit/kit_services.mock';
import type { MaterializedNode } from '../nodes';
import { createNodeValidator } from '../validate_node';
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

const asLegacyMetric = (node: MaterializedNode): LegacyMetricNode => {
  expect(node.type).toBe('legacyMetric');
  return node as LegacyMetricNode;
};

const scene = (node: LegacyMetricNode) =>
  resolveChart(node, {
    scheme: 'light',
    size: { width: 400, height: 200 },
    locale: 'en',
    timeZone: 'UTC',
  }) as LegacyMetricScene;

/** The table the `aggs` executor returns for a legacy metric's one `esaggs` column. */
const visitsTable = (rows: unknown[][] = [[640]]): Datatable => ({
  type: 'datatable',
  columns: [
    {
      id: 'col-0-0',
      name: 'Count',
      meta: { type: 'number', source: 'esaggs', params: { id: 'number' } },
    },
  ],
  rows: rows.map(([value]) => ({ 'col-0-0': value })),
});

const legacyConfig = (
  metric: Record<string, unknown> = {},
  overrides: Record<string, unknown> = {}
) => ({
  type: 'legacy_metric',
  title: 'Visits',
  data_source: { type: 'data_view_reference', ref_id: 'logs-dv' },
  metric: { operation: 'count', label: 'Visits', ...metric },
  ...overrides,
});

const plan = (config: unknown) => materializer.plan(materializer.parse(config), {});

const hex = (color: string | undefined) => (color ? chroma(color).hex() : undefined);

describe('Lens legacy metric planning', () => {
  it("runs the data view's metric as Lens's own `esaggs` would, with the panel's filters", () => {
    const requests = plan(
      legacyConfig(
        {},
        {
          filters: [
            { type: 'condition', condition: { field: 'host', operator: 'is', value: 'web-01' } },
          ],
        }
      )
    );
    expect(requests).toEqual([
      expect.objectContaining({
        kind: 'aggs',
        dataView: 'logs-dv',
        aggs: [expect.objectContaining({ type: 'count', schema: 'metric' })],
        context: { filters: [expect.objectContaining({ meta: expect.anything() })] },
      }),
    ]);
  });

  it('is unsupported with a query of its own', () => {
    const node = plan(legacyConfig({}, { query: { language: 'kql', expression: 'host : a' } }));
    expect(node).toMatchObject({
      type: 'unsupported',
      reason: 'Lens charts on a data view with a query of their own cannot be materialized yet.',
    });
  });
});

describe('Lens legacy metric mapping', () => {
  it("draws Lens's defaults: size m, label on top, left aligned, uncolored", async () => {
    const node = asLegacyMetric(map(legacyConfig(), [visitsTable()]));
    expect(await validate(node)).toEqual([]);
    expect(node).toEqual({
      type: 'legacyMetric',
      title: 'Visits',
      data: expect.any(Object),
      metrics: [{ column: 'legacy_metric_accessor' }],
    });
    const [tile] = scene(node).tiles;
    expect(tile.label).toBe('Visits');
    expect(tile.background).toBeUndefined();
  });

  it('maps size, label position and alignment', async () => {
    const node = asLegacyMetric(
      map(
        legacyConfig({
          size: 'xl',
          labels: { alignment: 'bottom' },
          values: { alignment: 'center' },
        }),
        [visitsTable()]
      )
    );
    expect(await validate(node)).toEqual([]);
    expect(node).toMatchObject({ size: 'xl', labelPosition: 'bottom', textAlign: 'center' });
  });

  it.each([
    [
      'absolute steps, on the background',
      'background',
      {
        type: 'dynamic',
        range: 'absolute',
        steps: [
          { lt: 500, color: '#D23115' },
          { gte: 500, lt: 1000, color: '#FCC400' },
          { gte: 1000, color: '#68BC00' },
        ],
      },
    ],
    ['a named palette, on the value', 'value', { type: 'distributed_palette', palette: 'status' }],
  ])('colors the value by %s, as Kibana does', async (_, applyColorTo, color) => {
    const table = visitsTable();
    const node = asLegacyMetric(
      map(legacyConfig({ apply_color_to: applyColorTo, color }), [table])
    );
    expect(await validate(node)).toEqual([]);

    // Kibana's own math: the palette Lens builds, colored against `getLegacyMetricDataBounds`.
    const steps = (color as { steps?: Array<{ lt?: number; color: string }> }).steps;
    const params = steps
      ? {
          colors: steps.map((step) => step.color),
          stops: steps.map((step) => step.lt ?? null),
          range: 'number',
          rangeMin: -Infinity,
          rangeMax: Infinity,
          continuity: 'all',
        }
      : {
          colors: getPalettes(false).get('status').colors(3),
          stops: [],
          range: 'number',
          rangeMin: -Infinity,
          rangeMax: Infinity,
          continuity: 'all',
        };
    const expected = hex(
      workoutColorForValue(640, params as never, getLegacyMetricDataBounds('col-0-0', table))
    );
    const resolved = scene(node);
    const [tile] = resolved.tiles;
    // A lone tile's background fills the chart, as Kibana's `colorFullBackground` does.
    expect(
      applyColorTo === 'value' ? hex(tile.value.color) : hex(tile.background ?? resolved.background)
    ).toBe(expected);
  });

  it('draws the first row when the query returns several, and says so', async () => {
    const node = asLegacyMetric(map(legacyConfig(), [visitsTable([[1], [2]])]));
    expect(await validate(node)).toEqual([]);
    expect(node.data.rows).toEqual([[1]]);
    expect(node.losses?.map(({ path }) => path)).toEqual(['data.rows']);
  });
});
