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
