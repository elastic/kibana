/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { DECIMAL_DEGREES_PRECISION } from '../../../../common/constants';

const ZOOM_TILE_KEY_INDEX = 0;
const X_TILE_KEY_INDEX = 1;
const Y_TILE_KEY_INDEX = 2;

function getTileCount(zoom) {
  return Math.pow(2, zoom);
}

export function parseTileKey(tileKey) {
  const tileKeyParts = tileKey.split('/');

  if (tileKeyParts.length !== 3) {
    throw new Error(`Invalid tile key, expecting "zoom/x/y" format but got ${tileKey}`);
  }

  const zoom = parseInt(tileKeyParts[ZOOM_TILE_KEY_INDEX], 10);
  const x = parseInt(tileKeyParts[X_TILE_KEY_INDEX], 10);
  const y = parseInt(tileKeyParts[Y_TILE_KEY_INDEX], 10);
  const tileCount = getTileCount(zoom);

  if (x >= tileCount) {
    throw new Error(
      `Tile key is malformed, expected x to be less than ${tileCount}, you provided ${x}`
    );
  }
  if (y >= tileCount) {
    throw new Error(
      `Tile key is malformed, expected y to be less than ${tileCount}, you provided ${y}`
    );
  }

  return { x, y, zoom, tileCount };
}

function sinh(x) {
  return (Math.exp(x) - Math.exp(-x)) / 2;
}

// Calculate the minimum precision required to adequtely draw the box
// bounds.
//
// ceil(abs(log10(tileSize))) tells us how many decimals of precision
// are minimally required to represent the number after rounding.
//
// We add one extra decimal level of precision because, at high zoom
// levels rounding exactly can cause the boxes to render as uneven sizes
// (some will be slightly larger and some slightly smaller)
function precisionRounding(v, minPrecision, binSize) {
  let precision = Math.ceil(Math.abs(Math.log10(binSize))) + 1;
  precision = Math.max(precision, minPrecision);
  return _.round(v, precision);
}

function tileToLatitude(y, tileCount) {
  const radians = Math.atan(sinh(Math.PI - (2 * Math.PI * y) / tileCount));
  const lat = (180 / Math.PI) * radians;
  return precisionRounding(lat, DECIMAL_DEGREES_PRECISION, 180 / tileCount);
}

function tileToLongitude(x, tileCount) {
  const lon = (x / tileCount) * 360 - 180;
  return precisionRounding(lon, DECIMAL_DEGREES_PRECISION, 360 / tileCount);
}

export function getTileBoundingBox(tileKey) {
  const { x, y, tileCount } = parseTileKey(tileKey);

  return {
    top: tileToLatitude(y, tileCount),
    bottom: tileToLatitude(y + 1, tileCount),
    left: tileToLongitude(x, tileCount),
    right: tileToLongitude(x + 1, tileCount),
  };
}

function sec(value) {
  return 1 / Math.cos(value);
}

function latitudeToTile(lat, tileCount) {
  const radians = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(radians) + sec(radians)) / Math.PI) / 2) * tileCount;
  return Math.floor(y);
}

function longitudeToTile(lon, tileCount) {
  const x = ((lon + 180) / 360) * tileCount;
  return Math.floor(x);
}

export function expandToTileBoundaries(extent, zoom) {
  const tileCount = getTileCount(zoom);

  const upperLeftX = longitudeToTile(extent.minLon, tileCount);
  const upperLeftY = latitudeToTile(Math.min(extent.maxLat, 90), tileCount);
  const lowerRightX = longitudeToTile(extent.maxLon, tileCount);
  const lowerRightY = latitudeToTile(Math.max(extent.minLat, -90), tileCount);

  return {
    minLon: tileToLongitude(upperLeftX, tileCount),
    minLat: tileToLatitude(lowerRightY + 1, tileCount),
    maxLon: tileToLongitude(lowerRightX + 1, tileCount),
    maxLat: tileToLatitude(upperLeftY, tileCount),
  };
}
