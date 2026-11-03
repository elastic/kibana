/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getGeotileLevelDelta, getGeotilePrecision } from '@kbn/geo-precision';
import type { GRID_RESOLUTION } from '../../../../common/constants';
import { RENDER_AS } from '../../../../common/constants';

export function getGeoGridPrecisionResolutionDelta(
  resolution: GRID_RESOLUTION,
  renderAs: RENDER_AS
): number {
  try {
    return getGeotileLevelDelta(resolution, renderAs === RENDER_AS.HEX);
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
  return getGeotilePrecision(zoom, resolution, renderAs === RENDER_AS.HEX);
}
