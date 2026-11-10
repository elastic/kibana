/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { getColorFactory } from '@kbn/coloring';
import { getKbnPalettes } from '@kbn/palettes';
import { buildModifiedVisAttributes } from './episodes_color_mapping';
import { HISTOGRAM_OTHER_BREAKDOWN } from '../constants';

const mockColors = {
  danger: '#ff0000',
  success: '#00ff00',
  primary: '#0000ff',
  warning: '#ff8800',
  mediumShade: '#999999',
};

const mockLensAttributes = {
  state: {
    visualization: {
      layers: [{ layerType: 'data', accessors: ['col_count'], yConfig: [] }],
      axisTitlesVisibilitySettings: { yLeft: true, yRight: true, x: true },
    },
  },
} as unknown as TypedLensByValueInput['attributes'];

describe('buildModifiedVisAttributes', () => {
  it('returns attributes unchanged when visualization has no layers', () => {
    const attrsWithNoLayers = {
      state: { visualization: {} },
    } as unknown as TypedLensByValueInput['attributes'];
    expect(buildModifiedVisAttributes(attrsWithNoLayers, undefined, {}, mockColors)).toBe(
      attrsWithNoLayers
    );
  });

  it('applies the danger (red) yConfig color when there is no breakdown and no status filter', () => {
    const result = buildModifiedVisAttributes(mockLensAttributes, undefined, {}, mockColors);
    const layer = (result.state?.visualization as any).layers[0];
    expect(layer.colorMapping).toBeUndefined();
    expect(layer.yConfig).toHaveLength(1);
    expect(layer.yConfig[0]).toMatchObject({ forAccessor: 'col_count', color: mockColors.danger });
  });

  it.each(['active', 'inactive', 'recovering', 'pending'] as const)(
    'colors the whole series to match the %s status filter when no breakdown is selected',
    (status) => {
      const result = buildModifiedVisAttributes(
        mockLensAttributes,
        undefined,
        { status: [status] },
        mockColors
      );
      const layer = (result.state?.visualization as any).layers[0];
      expect(layer.colorMapping).toBeUndefined();
      expect(layer.yConfig).toHaveLength(1);
      expect(layer.yConfig[0]).toMatchObject({
        forAccessor: 'col_count',
        color: expect.any(String),
      });
    }
  );

  it('applies the danger (red) yConfig color when multiple statuses are selected', () => {
    const result = buildModifiedVisAttributes(
      mockLensAttributes,
      undefined,
      { status: ['active', 'pending'] },
      mockColors
    );
    const layer = (result.state?.visualization as any).layers[0];
    expect(layer.yConfig[0]).toMatchObject({ forAccessor: 'col_count', color: mockColors.danger });
  });

  it('colors only the folded Other series when a breakdown other than episode.status is set', () => {
    const result = buildModifiedVisAttributes(
      mockLensAttributes,
      'rule.id',
      { status: ['active'] },
      mockColors
    );
    const layer = (result.state?.visualization as any).layers[0];
    expect(layer.yConfig).toEqual([]);
    expect(layer.colorMapping.assignments).toEqual([
      {
        rules: [
          {
            type: 'match',
            pattern: HISTOGRAM_OTHER_BREAKDOWN,
            matchEntireWord: true,
            matchCase: true,
          },
        ],
        color: { type: 'colorCode', colorCode: mockColors.mediumShade },
        touched: true,
      },
    ]);
    expect(layer.colorMapping.specialAssignments).toEqual([
      { rules: [{ type: 'other' }], color: { type: 'loop' }, touched: false },
    ]);
  });

  it('applies per-status colorMapping when breakdown is episode.status', () => {
    const result = buildModifiedVisAttributes(mockLensAttributes, 'episode.status', {}, mockColors);
    const layer = (result.state?.visualization as any).layers[0];
    expect(layer.colorMapping?.assignments).toHaveLength(4);
    const patterns = layer.colorMapping?.assignments.map(
      (a: { rules: Array<{ pattern: string }> }) => a.rules[0].pattern
    );
    expect(patterns).toEqual(
      expect.arrayContaining(['active', 'inactive', 'recovering', 'pending'])
    );
  });

  it('resolves the Other series to the neutral color and other values to the palette', () => {
    const result = buildModifiedVisAttributes(mockLensAttributes, 'rule.id', {}, mockColors);
    const { colorMapping } = (result.state?.visualization as any).layers[0];
    const colorFor = getColorFactory(
      colorMapping,
      getKbnPalettes({ name: 'amsterdam', darkMode: false }),
      false,
      { type: 'categories', categories: ['rule-a', HISTOGRAM_OTHER_BREAKDOWN] }
    );

    expect(colorFor(HISTOGRAM_OTHER_BREAKDOWN)).toBe(mockColors.mediumShade);
    expect(colorFor('rule-a')).not.toBe(mockColors.mediumShade);
  });
});
