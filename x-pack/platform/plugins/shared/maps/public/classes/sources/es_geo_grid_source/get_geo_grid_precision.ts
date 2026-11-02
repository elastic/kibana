/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  getGeohashPrecision,
  getGeohexPrecision,
  getGeotileLevelDelta,
  getGeotilePrecision,
  type GeoPrecisionResolution,
} from '@kbn/esql-utils';
import { GRID_RESOLUTION, RENDER_AS } from '../../../../common/constants';

export function getGeoGridPrecisionResolutionDelta(
  resolution: GRID_RESOLUTION,
  renderAs: RENDER_AS
): number {
  try {
    return getGeotileLevelDelta(
      resolution as unknown as GeoPrecisionResolution,
      renderAs === RENDER_AS.HEX
    );
  } catch (e) {
    throw new Error(
      i18n.translate('xpack.maps.source.esGrid.resolutionParamErrorMessage', {
        defaultMessage: `Grid resolution param not recognized: {resolution}`,
        values: {
          resolution,
        },
      })
    );
  }
}

/**
 * Geotile level (precision) for the given map zoom, resolution and render type.
 */
export function getGeoGridPrecision(
  zoom: number,
  resolution: GRID_RESOLUTION,
  renderAs: RENDER_AS
): number {
  getGeoGridPrecisionResolutionDelta(resolution, renderAs); // validates resolution
  return getGeotilePrecision(
    zoom,
    resolution as unknown as GeoPrecisionResolution,
    renderAs === RENDER_AS.HEX
  );
}

/**
 * H3 resolution (geohex precision) for the given map zoom and resolution.
 * Same calculation Elasticsearch performs for hex layers rendered with vector tiles.
 */
export function getGeoHexPrecision(zoom: number, resolution: GRID_RESOLUTION): number {
  return getGeohexPrecision(zoom, resolution as unknown as GeoPrecisionResolution);
}

/**
 * Geohash precision (1-12) for the given map zoom and resolution.
 * Elasticsearch has no vector tile rule for geohash grids, see `getGeohashPrecision`.
 */
export function getGeoHashPrecision(zoom: number, resolution: GRID_RESOLUTION): number {
  return getGeohashPrecision(zoom, resolution as unknown as GeoPrecisionResolution);
}
