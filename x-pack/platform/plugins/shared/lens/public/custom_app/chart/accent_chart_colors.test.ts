/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '../..';
import { applyAccentToChart } from './accent_chart_colors';

const PURPLE = '#6A4FD3';
const PURPLE_ON_DARK = '#B7A8F5';
const TEAL = '#00717D';

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
    const result = applyAccentToChart(chart({ accessors: ['count'] }), PURPLE);

    expect(layerOf(result).yConfig).toEqual([{ forAccessor: 'count', color: PURPLE }]);
  });

  it('uses the lighter accent on a dark background, where the fill would be too dark to see', () => {
    const result = applyAccentToChart(chart({ accessors: ['count'] }), PURPLE_ON_DARK);

    expect(layerOf(result).yConfig).toEqual([{ forAccessor: 'count', color: PURPLE_ON_DARK }]);
  });

  it('keeps what else was set for the series', () => {
    const result = applyAccentToChart(
      chart({ accessors: ['count'], yConfig: [{ forAccessor: 'count', axisMode: 'right' }] }),
      TEAL
    );

    expect(layerOf(result).yConfig).toEqual([
      { forAccessor: 'count', axisMode: 'right', color: TEAL },
    ]);
  });

  it('colours a series that is not broken down even when Lens gave the layer a colour mapping it does not use', () => {
    const result = applyAccentToChart(
      chart({ accessors: ['count'], colorMapping: { paletteId: 'default', assignments: [] } }),
      PURPLE
    );

    expect(layerOf(result).yConfig).toEqual([{ forAccessor: 'count', color: PURPLE }]);
    expect(layerOf(result).colorMapping).toEqual({ paletteId: 'default', assignments: [] });
  });

  it('leaves the values of a breakdown to the palette of Lens, which tells them apart', () => {
    const attributes = chart({
      accessors: ['count'],
      splitAccessor: 'service',
      colorMapping: { paletteId: 'default', assignments: [] },
    });

    expect(applyAccentToChart(attributes, PURPLE)).toEqual(attributes);
  });

  it('leaves the slices of a donut to the palette of Lens too', () => {
    const attributes = chart({
      primaryGroups: ['service'],
      metrics: ['count'],
      colorMapping: { paletteId: 'default' },
    });

    expect(applyAccentToChart(attributes, TEAL)).toEqual(attributes);
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

    expect(applyAccentToChart(attributes, PURPLE)).toEqual(attributes);
  });

  it('changes nothing for a page with no accent, or for a chart with no layers', () => {
    const attributes = chart({ accessors: ['count'] });
    expect(applyAccentToChart(attributes, undefined)).toBe(attributes);

    const donut = { state: { visualization: { shape: 'donut' } } } as unknown as Attributes;
    expect(applyAccentToChart(donut, PURPLE)).toBe(donut);
  });
});
