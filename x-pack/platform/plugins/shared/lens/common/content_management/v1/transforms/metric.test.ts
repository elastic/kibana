/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '../../../../public';
import type { LensAttributes } from '../../../../server/content_management/v1';
import { getUpdatedMetricState, metricMigrations } from './metric';

const baseState: MetricVisualizationState = {
  layerId: 'layer-1',
  layerType: 'data',
  metricAccessor: 'primary-id',
};

describe('getUpdatedMetricState', () => {
  it('promotes a non-empty secondaryPrefix to secondaryLabel and removes the prefix key', () => {
    expect(getUpdatedMetricState({ ...baseState, secondaryPrefix: 'custom-text' })).toEqual({
      ...baseState,
      secondaryLabel: 'custom-text',
    });
  });

  it('preserves an empty secondaryPrefix as secondaryLabel so the None choice survives', () => {
    expect(getUpdatedMetricState({ ...baseState, secondaryPrefix: '' })).toEqual({
      ...baseState,
      secondaryLabel: '',
    });
  });

  it('does not overwrite an existing secondaryLabel with secondaryPrefix', () => {
    expect(
      getUpdatedMetricState({
        ...baseState,
        secondaryLabel: 'kept',
        secondaryPrefix: 'ignored',
      })
    ).toEqual({
      ...baseState,
      secondaryLabel: 'kept',
    });
  });

  it('does not overwrite an empty secondaryLabel with a non-empty secondaryPrefix', () => {
    expect(
      getUpdatedMetricState({
        ...baseState,
        secondaryLabel: '',
        secondaryPrefix: 'ignored',
      })
    ).toEqual({
      ...baseState,
      secondaryLabel: '',
    });
  });

  it('moves valuesTextAlign onto primaryAlign and secondaryAlign and removes the legacy key', () => {
    expect(getUpdatedMetricState({ ...baseState, valuesTextAlign: 'right' })).toEqual({
      ...baseState,
      primaryAlign: 'right',
      secondaryAlign: 'right',
    });
  });

  it('does not overwrite primaryAlign or secondaryAlign when already set', () => {
    expect(
      getUpdatedMetricState({
        ...baseState,
        valuesTextAlign: 'center',
        primaryAlign: 'right',
        secondaryAlign: 'right',
      })
    ).toEqual({
      ...baseState,
      primaryAlign: 'right',
      secondaryAlign: 'right',
    });
  });

  it('is idempotent', () => {
    const once = getUpdatedMetricState({
      ...baseState,
      secondaryPrefix: 'custom-text',
      valuesTextAlign: 'right',
    });
    expect(getUpdatedMetricState(once)).toEqual(once);
  });
});

describe('metricMigrations', () => {
  it('returns attributes unchanged when state is missing', () => {
    const attributes = {
      visualizationType: 'lnsMetric',
    } as LensAttributes;

    expect(metricMigrations(attributes)).toBe(attributes);
  });

  it('returns attributes unchanged for a non-metric visualization', () => {
    const attributes = {
      state: {},
      visualizationType: 'lnsXY',
    } as LensAttributes;

    expect(metricMigrations(attributes)).toBe(attributes);
  });
});
