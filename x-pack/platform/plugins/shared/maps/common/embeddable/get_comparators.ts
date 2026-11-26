/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StateComparators } from '@kbn/presentation-publishing';
import { timeRangeComparators, titleComparators } from '@kbn/presentation-publishing';
import { drilldownsComparators } from '@kbn/embeddable-plugin/common';
import type { MapByReferenceState, MapByValueState, MapEmbeddableState } from './types';

export function getComparators(state: MapEmbeddableState): StateComparators<MapEmbeddableState> {
  const comparators: StateComparators<MapByReferenceState & MapByValueState> = {
    ...drilldownsComparators,
    ...titleComparators,
    ...timeRangeComparators,
    attributes:
      'savedObjectId' in state && state.savedObjectId !== undefined ? 'skip' : 'deepEquality',
    filterByMapExtent: 'referenceEquality',
    hiddenLayers: 'deepEquality',
    isLayerTOCOpen: 'referenceEquality',
    isMovementSynchronized: 'referenceEquality',
    mapBuffer: 'skip',
    mapCenter: (a, b) => {
      if (!a || !b) {
        return a === b;
      }

      if (a.lat !== b.lat) return false;
      if (a.lon !== b.lon) return false;
      // Map may not restore reset zoom exactly
      return Math.abs(a.zoom - b.zoom) < 0.05;
    },
    mapSettings: 'deepEquality',
    openTOCDetails: 'deepEquality',
    savedObjectId: 'skip',
  };
  return comparators;
}
