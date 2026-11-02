/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { GRID_RESOLUTION, RENDER_AS } from '../../../../common/constants';

const MAX_GEOTILE_LEVEL = 29;

export function getGeoGridPrecisionResolutionDelta(
  resolution: GRID_RESOLUTION,
  renderAs: RENDER_AS
): number {
  // Hexagon resolutions do not scale evenly to zoom levels.
  // zoomX and zoomX + 1 may result in the same hexagon resolution.
  // To avoid FINE and MOST_FINE providing potenitally the same resolution,
  // use 3 level resolution system that increases zoom + 3 per resolution step.
  if (renderAs === RENDER_AS.HEX) {
    if (resolution === GRID_RESOLUTION.COARSE) {
      return 2;
    }

    if (resolution === GRID_RESOLUTION.FINE || resolution === GRID_RESOLUTION.MOST_FINE) {
      return 5;
    }

    if (resolution === GRID_RESOLUTION.SUPER_FINE) {
      return 8;
    }
  }

  if (resolution === GRID_RESOLUTION.COARSE) {
    return 2;
  }

  if (resolution === GRID_RESOLUTION.FINE) {
    return 3;
  }

  if (resolution === GRID_RESOLUTION.MOST_FINE) {
    return 4;
  }

  if (resolution === GRID_RESOLUTION.SUPER_FINE) {
    return 8;
  }

  throw new Error(
    i18n.translate('xpack.maps.source.esGrid.resolutionParamErrorMessage', {
      defaultMessage: `Grid resolution param not recognized: {resolution}`,
      values: {
        resolution,
      },
    })
  );
}

/**
 * Geotile level (precision) for the given map zoom, resolution and render type.
 */
export function getGeoGridPrecision(
  zoom: number,
  resolution: GRID_RESOLUTION,
  renderAs: RENDER_AS
): number {
  const targetGeotileLevel =
    Math.ceil(zoom) + getGeoGridPrecisionResolutionDelta(resolution, renderAs);
  return Math.min(targetGeotileLevel, MAX_GEOTILE_LEVEL);
}

/**
 * H3 resolution (0-15) for each geotile level (0-29).
 * Same table Elasticsearch uses to turn the vector tile zoom into a geohex_grid precision
 * (`GridAggregation.GEOHEX` in the vector-tile plugin).
 */
// prettier-ignore
const GEOTILE_LEVEL_TO_H3_RESOLUTION = [
  0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 11, 12, 13, 14, 14, 15, 15, 15, 15,
];

/**
 * H3 resolution (geohex precision) for the given map zoom and resolution.
 * Same calculation Elasticsearch performs for hex layers rendered with vector tiles,
 * where the resolution delta is sent as `grid_precision`.
 */
export function getGeoHexPrecision(zoom: number, resolution: GRID_RESOLUTION): number {
  return GEOTILE_LEVEL_TO_H3_RESOLUTION[getGeoGridPrecision(zoom, resolution, RENDER_AS.HEX)];
}

/**
 * Geotile level with the same cell width at the equator as a geohash cell, indexed by
 * geohash precision - 1 (precision 1-12).
 */
const GEOHASH_PRECISION_TO_GEOTILE_LEVEL = [3, 5, 8, 10, 13, 15, 18, 20, 23, 25, 28, 30];

/**
 * Geohash precision (1-12) for the given map zoom and resolution.
 * Unlike geotile and geohex, Elasticsearch has no vector tile rule for geohash grids.
 * The geo grid geotile level for the zoom and resolution is converted to the geohash precision
 * whose cell width is closest to the width of a cell at that level (finer one when equally close).
 */
export function getGeoHashPrecision(zoom: number, resolution: GRID_RESOLUTION): number {
  const level = getGeoGridPrecision(zoom, resolution, RENDER_AS.GRID);
  let precision = 1;
  GEOHASH_PRECISION_TO_GEOTILE_LEVEL.forEach((geohashLevel, index) => {
    const best = GEOHASH_PRECISION_TO_GEOTILE_LEVEL[precision - 1];
    if (Math.abs(geohashLevel - level) <= Math.abs(best - level)) {
      precision = index + 1;
    }
  });
  return precision;
}
