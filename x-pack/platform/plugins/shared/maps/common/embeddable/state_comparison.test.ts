/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { areComparatorsEqual } from '@kbn/presentation-publishing';
import type { MapAttributes } from '../../server';
import type { MapEmbeddableState } from './types';
import { mapStateComparison } from './state_comparison';

const isEqual = (last: MapEmbeddableState, current: MapEmbeddableState) =>
  areComparatorsEqual(mapStateComparison.comparators, last, current);

const byValue = (title: string): MapEmbeddableState => ({
  attributes: { title } as MapAttributes,
});

describe('mapStateComparison', () => {
  it('tolerates small zoom differences in mapCenter', () => {
    expect(
      isEqual(
        { savedObjectId: '1', mapCenter: { lat: 1, lon: 2, zoom: 3 } },
        { savedObjectId: '1', mapCenter: { lat: 1, lon: 2, zoom: 3.01 } }
      )
    ).toBe(true);
    expect(
      isEqual(
        { savedObjectId: '1', mapCenter: { lat: 1, lon: 2, zoom: 3 } },
        { savedObjectId: '1', mapCenter: { lat: 1, lon: 2, zoom: 4 } }
      )
    ).toBe(false);
  });

  it('compares attributes of by-value states', () => {
    expect(isEqual(byValue('a'), byValue('a'))).toBe(true);
    expect(isEqual(byValue('a'), byValue('b'))).toBe(false);
  });

  it('detects unlinking from the library', () => {
    expect(isEqual({ savedObjectId: '1' }, byValue('a'))).toBe(false);
  });
});
