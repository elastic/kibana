/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import assert from 'assert';

/*
Partially copied from https://github.com/mapbox/mapbox-gl-js/blob/master/src/util/image.js
*/

function createImage(image, { width, height }, channels, data) {
  if (!data) {
    data = new Uint8Array(width * height * channels);
  } else if (data instanceof Uint8ClampedArray) {
    data = new Uint8Array(data.buffer);
  } else if (data.length !== width * height * channels) {
    throw new RangeError('mismatched image size');
  }
  image.width = width;
  image.height = height;
  image.data = data;
  return image;
}

function resizeImage(image, { width, height }, channels) {
  if (width === image.width && height === image.height) {
    return;
  }

  const newImage = createImage({}, { width, height }, channels);

  copyImage(image, newImage, { x: 0, y: 0 }, { x: 0, y: 0 }, {
    width: Math.min(image.width, width),
    height: Math.min(image.height, height)
  }, channels);

  image.width = width;
  image.height = height;
  image.data = newImage.data;
}

function copyImage(srcImg, dstImg, srcPt, dstPt, size, channels) {
  if (size.width === 0 || size.height === 0) {
    return dstImg;
  }

  if (size.width > srcImg.width ||
        size.height > srcImg.height ||
        srcPt.x > srcImg.width - size.width ||
        srcPt.y > srcImg.height - size.height) {
    throw new RangeError('out of range source coordinates for image copy');
  }

  if (size.width > dstImg.width ||
        size.height > dstImg.height ||
        dstPt.x > dstImg.width - size.width ||
        dstPt.y > dstImg.height - size.height) {
    throw new RangeError('out of range destination coordinates for image copy');
  }

  const srcData = srcImg.data;
  const dstData = dstImg.data;

  assert(srcData !== dstData);

  for (let y = 0; y < size.height; y++) {
    const srcOffset = ((srcPt.y + y) * srcImg.width + srcPt.x) * channels;
    const dstOffset = ((dstPt.y + y) * dstImg.width + dstPt.x) * channels;
    for (let i = 0; i < size.width * channels; i++) {
      dstData[dstOffset + i] = srcData[srcOffset + i];
    }
  }

  return dstImg;
}

export class AlphaImage {

  constructor(size, data) {
    createImage(this, size, 1, data);
  }

  resize(size) {
    resizeImage(this, size, 1);
  }

  clone() {
    return new AlphaImage({ width: this.width, height: this.height }, new Uint8Array(this.data));
  }

  static copy(srcImg, dstImg, srcPt, dstPt, size) {
    copyImage(srcImg, dstImg, srcPt, dstPt, size, 1);
  }
}

// Not premultiplied, because ImageData is not premultiplied.
// UNPACK_PREMULTIPLY_ALPHA_WEBGL must be used when uploading to a texture.
export class RGBAImage {

  // data must be a Uint8Array instead of Uint8ClampedArray because texImage2D does not
  // support Uint8ClampedArray in all browsers

  constructor(size, data) {
    createImage(this, size, 4, data);
  }

  resize(size) {
    resizeImage(this, size, 4);
  }

  replace(data, copy) {
    if (copy) {
      this.data.set(data);
    } else if (data instanceof Uint8ClampedArray) {
      this.data = new Uint8Array(data.buffer);
    } else {
      this.data = data;
    }
  }

  clone() {
    return new RGBAImage({ width: this.width, height: this.height }, new Uint8Array(this.data));
  }

  static copy(srcImg, dstImg, srcPt, dstPt, size) {
    copyImage(srcImg, dstImg, srcPt, dstPt, size, 4);
  }
}

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
