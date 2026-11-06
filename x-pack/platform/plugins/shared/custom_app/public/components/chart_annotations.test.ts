/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { MAX_CHART_ANNOTATIONS } from '@kbn/custom-app-common';
import { addAnnotationsToChart } from './chart_annotations';

type Attributes = TypedLensByValueInput['attributes'];

const xy = (extra: Record<string, unknown> = {}): Attributes =>
  ({
    title: 'chart',
    visualizationType: 'lnsXY',
    references: [],
    state: {
      adHocDataViews: { adhoc: { id: 'adhoc', title: 'logs-*' } },
      visualization: { layers: [{ layerId: 'data', layerType: 'data', accessors: ['count'] }] },
      ...extra,
    },
  } as unknown as Attributes);

const rows = {
  columns: [
    { name: 'when', type: 'date' },
    { name: 'what', type: 'keyword' },
  ],
  rows: [
    ['2026-01-01T10:00:00.000Z', 'Deploy 41'],
    [Date.parse('2026-01-02T12:00:00.000Z'), 'Deploy 42'],
    ['not a date', 'ignored'],
    ['2026-01-03T00:00:00.000Z', null],
  ],
};

const layersOf = (attributes: Attributes) =>
  (attributes.state.visualization as { layers: Array<Record<string, unknown>> }).layers;

describe('addAnnotationsToChart', () => {
  it('marks each row with a time as a line, named by its label, in a layer after the data', () => {
    const result = addAnnotationsToChart(xy(), rows, { time: 'when', label: 'what' });

    const [data, annotations] = layersOf(result);
    expect(data.layerType).toBe('data');
    expect(annotations).toMatchObject({
      layerType: 'annotations',
      persistanceType: 'byValue',
      ignoreGlobalFilters: true,
    });
    expect(
      (annotations.annotations as Array<Record<string, unknown>>).map(({ type, key, label }) => ({
        type,
        key,
        label,
      }))
    ).toEqual([
      {
        type: 'manual',
        key: { type: 'point_in_time', timestamp: '2026-01-01T10:00:00.000Z' },
        label: 'Deploy 41',
      },
      {
        type: 'manual',
        key: { type: 'point_in_time', timestamp: '2026-01-02T12:00:00.000Z' },
        label: 'Deploy 42',
      },
      {
        type: 'manual',
        key: { type: 'point_in_time', timestamp: '2026-01-03T00:00:00.000Z' },
        label: '2026-01-03T00:00:00.000Z',
      },
    ]);
  });

  it('gives the layer the data view of the chart, under the name Lens looks for', () => {
    const result = addAnnotationsToChart(xy(), rows, { time: 'when' });

    expect(result.state).toMatchObject({
      internalReferences: [
        {
          type: 'index-pattern',
          id: 'adhoc',
          name: `xy-visualization-layer-${String(layersOf(result)[1].layerId)}`,
        },
      ],
    });
  });

  it('keeps the references the chart has', () => {
    const result = addAnnotationsToChart(
      xy({ internalReferences: [{ type: 'index-pattern', id: 'adhoc', name: 'other' }] }),
      rows,
      { time: 'when' }
    );

    expect((result.state as { internalReferences: unknown[] }).internalReferences).toHaveLength(2);
  });

  it('marks no more than the limit', () => {
    const many = {
      columns: [{ name: 'when', type: 'date' }],
      rows: Array.from({ length: MAX_CHART_ANNOTATIONS + 50 }, (_, i) => [
        new Date(2026, 0, 1, 0, i).toISOString(),
      ]),
    };

    const result = addAnnotationsToChart(xy(), many, { time: 'when' });

    expect(layersOf(result)[1].annotations).toHaveLength(MAX_CHART_ANNOTATIONS);
  });

  it.each([
    [
      'a chart that is not over time and has no XY layers',
      { ...xy(), visualizationType: 'lnsPie' },
    ],
    ['a chart with no data view to hang the layer on', xy({ adHocDataViews: {} })],
  ])('leaves %s as it is', (_what, attributes) => {
    expect(addAnnotationsToChart(attributes as Attributes, rows, { time: 'when' })).toBe(
      attributes
    );
  });

  it('leaves the chart as it is when the time column is not in the rows, or no row has a time', () => {
    const attributes = xy();

    expect(addAnnotationsToChart(attributes, rows, { time: 'missing' })).toBe(attributes);
    expect(
      addAnnotationsToChart(
        attributes,
        { columns: rows.columns, rows: [['nope', 'x']] },
        { time: 'when' }
      )
    ).toBe(attributes);
  });
});
