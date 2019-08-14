/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { RGBAImage } from './image_utils';

export function removeOrphanedSourcesAndLayers(mbMap, layerList) {

  const mbStyle = mbMap.getStyle();
  const mbSourcesToRemove = [];
  for (const sourceId in mbStyle.sources) {
    if (mbStyle.sources.hasOwnProperty(sourceId)) {
      const layer = layerList.find(layer => {
        return layer.ownsMbSourceId(sourceId);
      });
      if (!layer) {
        mbSourcesToRemove.push(sourceId);
      }
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

/**
 * This is function assumes only a single layer moved in the layerList, compared to mbMap
 * It is optimized to minimize the amount of mbMap.moveLayer calls.
 * @param mbMap
 * @param layerList
 */
export function syncLayerOrderForSingleLayer(mbMap, layerList) {

  if (!layerList || layerList.length === 0) {
    return;
  }


  const mbLayers = mbMap.getStyle().layers.slice();
  const layerIds = mbLayers.map(mbLayer => {
    const layer = layerList.find(layer => layer.ownsMbLayerId(mbLayer.id));
    return layer.getId();
  });

  const currentLayerOrderLayerIds = _.uniq(layerIds);

  const newLayerOrderLayerIdsUnfiltered = layerList.map(l => l.getId());
  const newLayerOrderLayerIds  = newLayerOrderLayerIdsUnfiltered.filter(layerId =>  currentLayerOrderLayerIds.includes(layerId));

  let netPos = 0;
  let netNeg = 0;
  const movementArr = currentLayerOrderLayerIds.reduce((accu, id, idx) => {
    const movement = newLayerOrderLayerIds.findIndex(newOId => newOId === id) - idx;
    movement > 0 ? netPos++ : movement < 0 && netNeg++;
    accu.push({ id, movement });
    return accu;
  }, []);
  if (netPos === 0 && netNeg === 0) {
    return;
  }
  const movedLayerId = (netPos >= netNeg) && movementArr.find(l => l.movement < 0).id ||
      (netPos < netNeg) && movementArr.find(l => l.movement > 0).id;
  const nextLayerIdx = newLayerOrderLayerIds.findIndex(layerId => layerId === movedLayerId) + 1;

  let nextMbLayerId;
  if (nextLayerIdx === newLayerOrderLayerIds.length) {
    nextMbLayerId = null;
  } else {
    const foundLayer = mbLayers.find(({ id: mbLayerId }) => {
      const layerId = newLayerOrderLayerIds[nextLayerIdx];
      const layer = layerList.find(layer => layer.getId() === layerId);
      return layer.ownsMbLayerId(mbLayerId);
    });
    nextMbLayerId = foundLayer.id;
  }

  const movedLayer = layerList.find(layer => layer.getId() === movedLayerId);
  mbLayers.forEach(({ id: mbLayerId }) => {
    if (movedLayer.ownsMbLayerId(mbLayerId)) {
      mbMap.moveLayer(mbLayerId, nextMbLayerId);
    }
  });

}

function getImageData(img) {
  const canvas = window.document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('failed to create canvas 2d context');
  }
  canvas.width = img.width;
  canvas.height = img.height;
  context.drawImage(img, 0, 0, img.width, img.height);
  return context.getImageData(0, 0, img.width, img.height);
}

export async function addSpritesheetToMap(json, img, mbMap) {
  const image = new Image();
  image.onload = (el) => {
    const imgData = getImageData(el.currentTarget);
    for (const imageId in json) {
      if (json.hasOwnProperty(imageId)) {
        const { width, height, x, y, sdf, pixelRatio } = json[imageId];
        const data = new RGBAImage({ width, height });
        RGBAImage.copy(imgData, data, { x, y }, { x: 0, y: 0 }, { width, height });
        // TODO not sure how to catch errors?
        mbMap.addImage(imageId, data, { pixelRatio, sdf });
      }
    }
  };
  image.src = img;
}
