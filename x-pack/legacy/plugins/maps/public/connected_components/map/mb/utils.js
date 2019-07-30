/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER } from '../../../../common/constants';

export function removeOrphanedSourcesAndLayers(mbMap, layerList) {
  const layerIds = layerList.map((layer) => layer.getId());
  const mbStyle = mbMap.getStyle();
  const mbSourcesToRemove = [];
  for (const sourceId in mbStyle.sources) {
    if (layerIds.indexOf(sourceId) === -1) {
      mbSourcesToRemove.push(sourceId);
    }
  }
  const mbLayersToRemove = [];
  mbStyle.layers.forEach(layer => {
    if (mbSourcesToRemove.indexOf(layer.source) >= 0) {
      mbLayersToRemove.push(layer.id);
    }
  });
  mbLayersToRemove.forEach((layerId) => {
    mbMap.removeLayer(layerId);
  });
  mbSourcesToRemove.forEach(sourceId => {
    mbMap.removeSource(sourceId);
  });

}

export function syncLayerOrder(mbMap, layerList) {

  if (!layerList || layerList.length === 0) {
    return;
  }


  const mbLayers = mbMap.getStyle().layers.slice();

  //This assumes that:
  //- a single source-id identifies a single kibana layer
  //- all layer-ids have a pattern that is sourceId_layerName, where sourceId cannot have any underscores
  const currentLayerOrderLayerIds = _.uniq(
    mbLayers.map(({ id }) => id.substring(0, id.indexOf(MB_SOURCE_ID_LAYER_ID_PREFIX_DELIMITER))));

  const newLayerOrderLayerIds = layerList.map(l => l.getId()).filter(layerId => currentLayerOrderLayerIds.includes(layerId));


  let netPos = 0;
  let netNeg = 0;
  const movementArr = currentLayerOrderLayerIds.reduce((accu, id, idx) => {
    const movement = newLayerOrderLayerIds.findIndex(newOId => newOId === id) - idx;
    movement > 0 ? netPos++ : movement < 0 && netNeg++;
    accu.push({ id, movement });
    return accu;
  }, []);
  if (netPos === 0 && netNeg === 0) { return; }
  const movedLayer = (netPos >= netNeg) && movementArr.find(l => l.movement < 0).id ||
      (netPos < netNeg) && movementArr.find(l => l.movement > 0).id;
  const nextLayerIdx = newLayerOrderLayerIds.findIndex(layerId => layerId === movedLayer) + 1;
  const nextLayerId = nextLayerIdx === newLayerOrderLayerIds.length ? null :
    mbLayers.find(({ id }) => id.startsWith(newLayerOrderLayerIds[nextLayerIdx])).id;

  mbLayers.forEach(({ id }) => {
    if (id.startsWith(movedLayer)) {
      mbMap.moveLayer(id, nextLayerId);
    }
  });

}
