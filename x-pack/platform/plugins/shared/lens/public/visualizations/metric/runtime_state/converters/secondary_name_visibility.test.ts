/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';
import { convertSecondaryNameVisibility } from './secondary_name_visibility';

const baseState: MetricVisualizationState = {
  layerId: 'layer-1',
  layerType: 'data',
  metricAccessor: 'primary-id',
  secondaryMetricAccessor: 'secondary-id',
};

describe('convertSecondaryNameVisibility', () => {
  it('hides the name when secondaryPrefix was explicitly emptied', () => {
    expect(convertSecondaryNameVisibility({ ...baseState, secondaryPrefix: '' })).toEqual({
      ...baseState,
      secondaryNameVisibility: 'hidden',
    });
  });

  it('keeps a custom secondaryLabel as a runtime fallback and shows the name before the value', () => {
    expect(convertSecondaryNameVisibility({ ...baseState, secondaryLabel: 'custom-text' })).toEqual(
      {
        ...baseState,
        secondaryLabel: 'custom-text',
        secondaryNameVisibility: 'before',
      }
    );
  });

  it('promotes secondaryPrefix to secondaryLabel when secondaryLabel is unset', () => {
    expect(
      convertSecondaryNameVisibility({ ...baseState, secondaryPrefix: 'custom-text' })
    ).toEqual({
      ...baseState,
      secondaryLabel: 'custom-text',
      secondaryNameVisibility: 'before',
    });
  });

  it('shows the name before the value when no legacy label was persisted', () => {
    expect(convertSecondaryNameVisibility(baseState)).toEqual({
      ...baseState,
      secondaryNameVisibility: 'before',
    });
  });

  it('preserves an explicit secondaryNameVisibility over the legacy label', () => {
    expect(
      convertSecondaryNameVisibility({
        ...baseState,
        secondaryNameVisibility: 'after',
        secondaryLabel: 'ignored',
      })
    ).toEqual({
      ...baseState,
      secondaryLabel: 'ignored',
      secondaryNameVisibility: 'after',
    });
  });

  it('migrates the pre-rename secondaryLabelPosition key', () => {
    const legacyState = {
      ...baseState,
      secondaryLabelPosition: 'after',
    } as MetricVisualizationState;

    expect(convertSecondaryNameVisibility(legacyState)).toEqual({
      ...baseState,
      secondaryNameVisibility: 'after',
    });
  });

  it('leaves the position unset without a secondary metric', () => {
    const { secondaryMetricAccessor, ...rest } = baseState;
    expect(convertSecondaryNameVisibility({ ...rest, secondaryLabel: '' })).toEqual(rest);
  });

  it('moves valuesTextAlign onto primaryAlign and secondaryAlign', () => {
    expect(convertSecondaryNameVisibility({ ...baseState, valuesTextAlign: 'right' })).toEqual({
      ...baseState,
      primaryAlign: 'right',
      secondaryAlign: 'right',
      secondaryNameVisibility: 'before',
    });
  });

  it('does not overwrite primaryAlign or secondaryAlign when already set', () => {
    expect(
      convertSecondaryNameVisibility({
        ...baseState,
        valuesTextAlign: 'center',
        primaryAlign: 'right',
        secondaryAlign: 'right',
      })
    ).toEqual({
      ...baseState,
      primaryAlign: 'right',
      secondaryAlign: 'right',
      secondaryNameVisibility: 'before',
    });
  });

  it('is idempotent', () => {
    const once = convertSecondaryNameVisibility({
      ...baseState,
      secondaryLabel: 'custom-text',
      secondaryLabelPosition: 'after',
    } as MetricVisualizationState);
    expect(convertSecondaryNameVisibility(once)).toEqual(once);
  });
});
