/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { buildModifiedVisAttributes } from './episodes_color_mapping';

const mockColors = {
  danger: '#ff0000',
  success: '#00ff00',
  primary: '#0000ff',
  warning: '#ff8800',
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
        { status },
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

  it('does not set yConfig color when a breakdown field other than effective_status is set', () => {
    const result = buildModifiedVisAttributes(
      mockLensAttributes,
      'rule.id',
      { status: 'active' },
      mockColors
    );
    const layer = (result.state?.visualization as any).layers[0];
    expect(layer.colorMapping).toBeUndefined();
    expect(layer.yConfig).toEqual([]);
  });

  it('applies per-status colorMapping when breakdown is effective_status', () => {
    const result = buildModifiedVisAttributes(
      mockLensAttributes,
      'effective_status',
      {},
      mockColors
    );
    const layer = (result.state?.visualization as any).layers[0];
    expect(layer.colorMapping?.assignments).toHaveLength(4);
    const patterns = layer.colorMapping?.assignments.map(
      (a: { rules: Array<{ pattern: string }> }) => a.rules[0].pattern
    );
    expect(patterns).toEqual(
      expect.arrayContaining(['active', 'inactive', 'recovering', 'pending'])
    );
  });
});
