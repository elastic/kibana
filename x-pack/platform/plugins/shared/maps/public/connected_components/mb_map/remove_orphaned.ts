/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { isGlDrawLayer } from './sort_layers';
import { ILayer } from '../../classes/layers/layer';

export function removeOrphanedSourcesAndLayers(
  mbMap: MbMap,
  layerList: ILayer[],
  spatialFilterLayer: ILayer
) {
  const mbStyle = mbMap.getStyle();
  if (!mbStyle.layers) {
    return;
  }

  mbStyle.layers.forEach((mbLayer) => {
    // ignore mapbox layers from spatial filter layer
    if (spatialFilterLayer.ownsMbLayerId(mbLayer.id)) {
      return;
    }

    // ignore gl-draw layers
    if (isGlDrawLayer(mbLayer.id)) {
      return;
    }

    const targetLayer = layerList.find((layer) => {
      return layer.ownsMbLayerId(mbLayer.id);
    });
    if (!targetLayer) {
      mbMap.removeLayer(mbLayer.id);
    }
  });

  for (const mbSourceId in mbStyle.sources) {
    if (Object.hasOwn(mbStyle.sources, mbSourceId)) {
      // ignore mapbox sources from spatial filter layer
      if (spatialFilterLayer.ownsMbSourceId(mbSourceId)) {
        continue;
      }

      const targetLayer = layerList.find((layer) => {
        return layer.ownsMbSourceId(mbSourceId);
      });
      if (!targetLayer) {
        mbMap.removeSource(mbSourceId);
      }
    }
  }
}
