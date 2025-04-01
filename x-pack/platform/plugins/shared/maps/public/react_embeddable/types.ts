/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import type {
  HasEditCapabilities,
  HasLibraryTransforms,
  HasSupportedTriggers,
  HasType,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesUnifiedSearch,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import type { HasDynamicActions } from '@kbn/embeddable-enhanced-plugin/public';
import type { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import type { Observable } from 'rxjs';
import type { MapAttributes } from '../../common/content_management';
import type {
  LayerDescriptor,
  MapCenterAndZoom,
  MapExtent,
  MapSettings,
} from '../../common/descriptor_types';
import type { ILayer } from '../classes/layers/layer';
import type { EventHandlers } from '../reducers/non_serializable_instances';

export type MapSerializedState = SerializedTitles &
  Partial<DynamicActionsSerializedState> & {
    // by-value
    attributes?: MapAttributes;
    // by-reference
    savedObjectId?: string;

    isLayerTOCOpen?: boolean;
    openTOCDetails?: string[];
    mapCenter?: MapCenterAndZoom;
    mapBuffer?: MapExtent;
    mapSettings?: Partial<MapSettings>;
    hiddenLayers?: string[];
    timeRange?: TimeRange;
    filterByMapExtent?: boolean;
    isMovementSynchronized?: boolean;
  };

export type MapRuntimeState = MapSerializedState;

export type MapApi = DefaultEmbeddableApi<MapSerializedState> &
  HasDynamicActions &
  Partial<HasEditCapabilities> &
  HasInspectorAdapters &
  HasSupportedTriggers &
  PublishesDataLoading &
  PublishesDataViews &
  PublishesUnifiedSearch &
  HasLibraryTransforms<MapSerializedState, MapSerializedState> & {
    getLayerList: () => ILayer[];
    reload: () => void;
    setEventHandlers: (eventHandlers: EventHandlers) => void;
    setLayerList: (layerList: LayerDescriptor[]) => void;
    updateLayerById: (layerDescriptor: LayerDescriptor) => void;
    onRenderComplete$: Observable<void>;
  };

export const isMapApi = (api: unknown): api is MapApi => {
  return Boolean(
    api && (api as HasType)?.type === 'map' && typeof (api as MapApi).getLayerList === 'function'
  );
};
