/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { applyAccentToChart } from './accent_chart_colors';
import { ACCENT_COLORS } from './page_theme';

type Attributes = TypedLensByValueInput['attributes'];

const chart = (layer: Record<string, unknown>): Attributes =>
  ({
    title: '',
    visualizationType: 'lnsXY',
    references: [],
    state: { visualization: { layers: [{ layerType: 'data', ...layer }] } },
  } as unknown as Attributes);

const layerOf = (attributes: Attributes) =>
  (attributes.state.visualization as { layers: Array<Record<string, unknown>> }).layers[0];

describe('applyAccentToChart', () => {
  it('draws a single series in the accent of the page', () => {
    const result = applyAccentToChart(chart({ accessors: ['count'] }), 'purple', false);

    expect(layerOf(result).yConfig).toEqual([
      { forAccessor: 'count', color: ACCENT_COLORS.purple.fill },
    ]);
  });

  it('uses the lighter accent on a dark background, where the fill would be too dark to see', () => {
    const result = applyAccentToChart(chart({ accessors: ['count'] }), 'purple', true);

    expect(layerOf(result).yConfig).toEqual([
      { forAccessor: 'count', color: ACCENT_COLORS.purple.textOnDark },
    ]);
  });

  it('keeps what else was set for the series', () => {
    const result = applyAccentToChart(
      chart({ accessors: ['count'], yConfig: [{ forAccessor: 'count', axisMode: 'right' }] }),
      'teal',
      false
    );

    expect(layerOf(result).yConfig).toEqual([
      { forAccessor: 'count', axisMode: 'right', color: ACCENT_COLORS.teal.fill },
    ]);
  });

  it('colours the values of a breakdown in shades of the accent, keeping the rest of the mapping', () => {
    const result = applyAccentToChart(
      chart({
        accessors: ['count'],
        splitAccessor: 'service',
        colorMapping: {
          paletteId: 'default',
          assignments: [{ rules: [] }],
          specialAssignments: [],
        },
      }),
      'purple',
      false
    );

    expect(layerOf(result).colorMapping).toEqual({
      paletteId: 'default',
      assignments: [],
      specialAssignments: [],
      colorMode: {
        type: 'gradient',
        steps: [{ type: 'colorCode', colorCode: ACCENT_COLORS.purple.fill }],
        sort: 'desc',
      },
    });
    expect(layerOf(result).yConfig).toBeUndefined();
  });

  it('colours the slices of a donut the same way', () => {
    const result = applyAccentToChart(
      chart({
        primaryGroups: ['service'],
        metrics: ['count'],
        colorMapping: { paletteId: 'default' },
      }),
      'teal',
      true
    );

    expect((layerOf(result).colorMapping as { colorMode: unknown }).colorMode).toEqual({
      type: 'gradient',
      steps: [{ type: 'colorCode', colorCode: ACCENT_COLORS.teal.textOnDark }],
      sort: 'desc',
    });
  });

  it.each([
    [
      'a series split by a field, with a palette that is not a colour mapping',
      { accessors: ['count'], splitAccessor: 'service' },
    ],
    ['more than one series', { accessors: ['count', 'errors'] }],
    ['a layer that is not data', { accessors: ['count'], layerType: 'referenceLine' }],
  ])('leaves %s to the palette of Lens, which tells values apart', (_name, layer) => {
    const attributes = chart(layer);

    expect(applyAccentToChart(attributes, 'purple', false)).toEqual(attributes);
  });

  it('changes nothing for a page with no accent, or for a chart with no layers', () => {
    const attributes = chart({ accessors: ['count'] });
    expect(applyAccentToChart(attributes, undefined, false)).toBe(attributes);

    const donut = { state: { visualization: { shape: 'donut' } } } as unknown as Attributes;
    expect(applyAccentToChart(donut, 'purple', false)).toBe(donut);
  });
});
