/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';
import {
  MapLayerEventHandlers,
  MapLayer,
  OnDataLoadEndProps,
  OnDataLoadErrorProps,
  OnDataLoadProps,
} from '../types';

type Return = [boolean, MapLayer[], MapLayerEventHandlers];

export const mergeMapLayers = (
  prevMapLayers: MapLayer[],
  dataId: string,
  layerId: string,
  isLoading: boolean,
  featuresCount = 0,
  errorMessage = ''
): MapLayer[] => {
  if (prevMapLayers.find(ls => ls.layerId === layerId) === undefined) {
    return [...prevMapLayers, { dataId, layerId, isLoading, featuresCount, errorMessage }];
  } else {
    return prevMapLayers.map<MapLayer>(ml => {
      return ml.layerId === layerId
        ? { dataId: ml.dataId, layerId: ml.layerId, isLoading, featuresCount, errorMessage }
        : ml;
    });
  }
};

export const isMapLoading = (mapLayers: MapLayer[]) =>
  mapLayers.length !== 0 && mapLayers.some(ml => ml.isLoading);

/**
 * Hook for keeping track of map layer state and when they are loading
 *
 * @returns
 * isLoading: boolean of whether or not at least one layer is currently loading
 * mapLayers: MapLayer[] current state of all layers
 * mapLayerEventHandlers: MapLayerEventHandlers to pass into mapEmbeddableFactory.createFromState() to register handlers
 */
export const useMapLayers = (): Return => {
  const [mapLayers, setMapLayers] = useState<MapLayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const eventHandlers: MapLayerEventHandlers = {
    onDataLoad: ({ layerId, dataId }: OnDataLoadProps) => {
      // TODO: Ask maps team why root layer is includes onDataLoad but not onDataLoadEnd
      if (layerId.startsWith('root-layer')) {
        return;
      }

      setMapLayers(prevMapLayers => mergeMapLayers(prevMapLayers, dataId, layerId, true));
    },
    onDataLoadEnd: ({ layerId, dataId, featuresCount }: OnDataLoadEndProps) => {
      setMapLayers(prevMapLayers =>
        mergeMapLayers(prevMapLayers, dataId, layerId, false, featuresCount)
      );
    },
    onDataLoadError: ({ layerId, dataId, errorMessage }: OnDataLoadErrorProps) => {
      setMapLayers(prevMapLayers =>
        mergeMapLayers(prevMapLayers, dataId, layerId, false, 0, errorMessage)
      );
    },
  };

  useEffect(() => {
    setIsLoading(isMapLoading(mapLayers));
  }, [setIsLoading(isMapLoading(mapLayers))]);

  return [isLoading, mapLayers, eventHandlers];
};
