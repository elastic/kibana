/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState } from '@kbn/lens-common';
import { convertToRuntimeState } from '..';

const baseState: MetricVisualizationState = {
  layerId: 'layer-1',
  layerType: 'data',
  metricAccessor: 'primary-id',
  secondaryMetricAccessor: 'secondary-id',
};

/**
 * Only the fields this conversion owns. Keys left `undefined` are ignored by `toEqual`,
 * so asserting on this slice also asserts that the legacy keys were consumed.
 */
const secondaryNameState = ({
  secondaryLabel,
  secondaryNameVisibility,
  secondaryLabelPosition,
}: MetricVisualizationState) => ({
  secondaryLabel,
  secondaryNameVisibility,
  secondaryLabelPosition,
});

// Asserted through the whole chain rather than against the converter alone: the v1
// content management transform runs first and rewrites the legacy fields this
// conversion reads, so a converter-only assertion does not describe real saved objects.
describe('convertToRuntimeState - secondary name visibility', () => {
  it('keeps a custom secondaryLabel as a render fallback and shows the name before the value', () => {
    expect(
      secondaryNameState(convertToRuntimeState({ ...baseState, secondaryLabel: 'custom-text' }))
    ).toEqual({
      secondaryLabel: 'custom-text',
      secondaryNameVisibility: 'before',
    });
  });

  it('hides the name when secondaryLabel was explicitly emptied', () => {
    expect(secondaryNameState(convertToRuntimeState({ ...baseState, secondaryLabel: '' }))).toEqual(
      {
        secondaryNameVisibility: 'hidden',
      }
    );
  });

  it('hides the name when a legacy secondaryPrefix was explicitly emptied', () => {
    expect(
      secondaryNameState(convertToRuntimeState({ ...baseState, secondaryPrefix: '' }))
    ).toEqual({
      secondaryNameVisibility: 'hidden',
    });
  });

  it('shows the name before the value when no legacy label was persisted', () => {
    expect(secondaryNameState(convertToRuntimeState(baseState))).toEqual({
      secondaryNameVisibility: 'before',
    });
  });

  it('migrates the pre-rename secondaryLabelPosition key', () => {
    expect(
      secondaryNameState(convertToRuntimeState({ ...baseState, secondaryLabelPosition: 'after' }))
    ).toEqual({
      secondaryNameVisibility: 'after',
    });
  });

  it('preserves an explicit secondaryNameVisibility over the legacy position', () => {
    expect(
      secondaryNameState(
        convertToRuntimeState({
          ...baseState,
          secondaryNameVisibility: 'after',
          secondaryLabelPosition: 'before',
          secondaryLabel: 'custom-text',
        })
      )
    ).toEqual({
      secondaryLabel: 'custom-text',
      secondaryNameVisibility: 'after',
    });
  });

  it('leaves the name visibility and the legacy label unset without a secondary metric', () => {
    const { secondaryMetricAccessor, ...stateWithoutSecondary } = baseState;
    expect(
      secondaryNameState(
        convertToRuntimeState({ ...stateWithoutSecondary, secondaryLabel: 'custom-text' })
      )
    ).toEqual({});
  });

  it('is idempotent', () => {
    const once = convertToRuntimeState({
      ...baseState,
      secondaryLabel: 'custom-text',
      secondaryLabelPosition: 'after',
    });
    expect(convertToRuntimeState(once)).toEqual(once);
  });
});
