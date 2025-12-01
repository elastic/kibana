/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public';
import type { SerializedTimeRange, SerializedTitles } from '@kbn/presentation-publishing';
import type { MapCenterAndZoom, MapExtent, MapSettings } from '../descriptor_types';
import type { MapAttributes } from '../../server';

export type MapEmbeddableBaseState = SerializedTimeRange &
  SerializedTitles &
  Partial<DynamicActionsSerializedState> & {
    isLayerTOCOpen?: boolean;
    openTOCDetails?: string[];
    mapCenter?: MapCenterAndZoom;
    mapBuffer?: MapExtent;
    mapSettings?: Partial<MapSettings>;
    hiddenLayers?: string[];
    filterByMapExtent?: boolean;
    isMovementSynchronized?: boolean;
  };

export type MapByReferenceState = MapEmbeddableBaseState & {
  savedObjectId: string;
};

export type MapByValueState = MapEmbeddableBaseState & {
  attributes: MapAttributes;
};

export type MapEmbeddableState = MapByReferenceState | MapByValueState;
