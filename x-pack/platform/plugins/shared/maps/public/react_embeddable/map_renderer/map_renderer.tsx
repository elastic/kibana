/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { useSearchApi } from '@kbn/presentation-publishing';
import type {
  LayerDescriptor,
  MapCenterAndZoom,
  MapSettings,
} from '../../../common/descriptor_types';
import { createBasemapLayerDescriptor } from '../../classes/layers/create_basemap_layer_descriptor';
import { MapApi, MapRuntimeState, MapSerializedState } from '../types';
import { MAP_SAVED_OBJECT_TYPE } from '../../../common/constants';
import { RenderToolTipContent } from '../../classes/tooltips/tooltip_property';
import { MAP_RENDERER_TYPE } from './types';

function getLayers(layerList: LayerDescriptor[]) {
  const basemapLayer = createBasemapLayerDescriptor();
  return basemapLayer ? [basemapLayer, ...layerList] : layerList;
}

export interface Props {
  title?: string;
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  layerList: LayerDescriptor[];
  mapSettings?: Partial<MapSettings>;
  hideFilterActions?: boolean;
  isLayerTOCOpen?: boolean;
  mapCenter?: MapCenterAndZoom;
  getTooltipRenderer?: () => RenderToolTipContent;
  onApiAvailable?: (api: MapApi) => void;
  /*
   * Set to false to exclude sharing attributes 'data-*'.
   */
  isSharable?: boolean;
}

export function MapRenderer(props: Props) {
  const mapApiRef = useRef<MapApi | undefined>(undefined);
  const beforeApiReadyLayerListRef = useRef<LayerDescriptor[] | undefined>(undefined);

  useEffect(() => {
    if (mapApiRef.current) {
      mapApiRef.current.setLayerList(getLayers(props.layerList));
    } else {
      beforeApiReadyLayerListRef.current = getLayers(props.layerList);
    }
  }, [props.layerList]);

  const searchApi = useSearchApi({
    filters: props.filters,
    query: props.query,
    timeRange: props.timeRange,
  });

  return (
    <div className="mapEmbeddableContainer">
      <ReactEmbeddableRenderer<MapSerializedState, MapRuntimeState, MapApi>
        type={MAP_SAVED_OBJECT_TYPE}
        getParentApi={() => ({
          type: MAP_RENDERER_TYPE,
          getTooltipRenderer: props.getTooltipRenderer,
          hideFilterActions: props.hideFilterActions,
          isSharable: props.isSharable,
          getSerializedStateForChild: () => {
            return {
              rawState: {
                attributes: {
                  title: props.title ?? '',
                  layerListJSON: JSON.stringify(getLayers(props.layerList)),
                },
                hidePanelTitles: !Boolean(props.title),
                isLayerTOCOpen:
                  typeof props.isLayerTOCOpen === 'boolean' ? props.isLayerTOCOpen : false,
                mapCenter: props.mapCenter,
                mapSettings: props.mapSettings ?? {},
              },
              references: [],
            };
          },
          ...searchApi,
        })}
        onApiAvailable={(api) => {
          mapApiRef.current = api;
          if (beforeApiReadyLayerListRef.current) {
            api.setLayerList(beforeApiReadyLayerListRef.current);
          }

          if (props.onApiAvailable) {
            props.onApiAvailable(api);
          }
        }}
        hidePanelChrome={true}
      />
    </div>
  );
}
