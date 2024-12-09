/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import {
  apiIsOfType,
  apiPublishesPanelTitle,
  apiPublishesUnifiedSearch,
  HasEditCapabilities,
  HasLibraryTransforms,
  HasSupportedTriggers,
  PublishesDataLoading,
  PublishesDataViews,
  PublishesUnifiedSearch,
  SerializedTitles,
} from '@kbn/presentation-publishing';
import { HasDynamicActions } from '@kbn/embeddable-enhanced-plugin/public';
import { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import { Observable } from 'rxjs';
import { MapAttributes } from '../../common/content_management';
import {
  LayerDescriptor,
  MapCenterAndZoom,
  MapExtent,
  MapSettings,
} from '../../common/descriptor_types';
import { ILayer } from '../classes/layers/layer';
import { EventHandlers } from '../reducers/non_serializable_instances';

export type MapSerializedState = SerializedTitles &
  Partial<DynamicActionsSerializedState> & {
    // by-valye
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
  HasLibraryTransforms<MapSerializedState> & {
    getLayerList: () => ILayer[];
    reload: () => void;
    setEventHandlers: (eventHandlers: EventHandlers) => void;
    setLayerList: (layerList: LayerDescriptor[]) => void;
    updateLayerById: (layerDescriptor: LayerDescriptor) => void;
    onRenderComplete$: Observable<void>;
  };

export const isMapApi = (api: unknown): api is MapApi => {
  return Boolean(
    api &&
      apiIsOfType(api, 'map') &&
      typeof (api as MapApi).getLayerList === 'function' &&
      apiPublishesPanelTitle(api) &&
      apiPublishesUnifiedSearch(api)
  );
};
