/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { drilldownsComparators } from '@kbn/embeddable-plugin/common';
import type { SerializedStateComparison } from '@kbn/presentation-publishing';
import { timeRangeComparators, titleComparators } from '@kbn/presentation-publishing';
import type { MapByReferenceState, MapByValueState } from './types';

type MapComparedState = MapByReferenceState & MapByValueState;

// By-value and by-reference keys never appear on the same state, so they compare equal when absent.
export const mapStateComparison: SerializedStateComparison<MapComparedState> = {
  comparators: {
    ...drilldownsComparators,
    ...titleComparators,
    ...timeRangeComparators,
    isMovementSynchronized: 'referenceEquality',
    filterByMapExtent: 'referenceEquality',
    hiddenLayers: 'deepEquality',
    isLayerTOCOpen: 'referenceEquality',
    mapCenter: (a, b) => {
      if (!a || !b) {
        return a === b;
      }

      if (a.lat !== b.lat) return false;
      if (a.lon !== b.lon) return false;
      // Map may not restore reset zoom exactly
      return Math.abs(a.zoom - b.zoom) < 0.05;
    },
    mapBuffer: 'skip',
    openTOCDetails: 'deepEquality',
    mapSettings: 'deepEquality',
    attributes: 'deepEquality',
    savedObjectId: 'referenceEquality',
  },
};
