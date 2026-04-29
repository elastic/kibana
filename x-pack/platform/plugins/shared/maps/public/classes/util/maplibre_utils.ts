/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { round } from 'lodash';
import type { LngLatBounds } from '@kbn/mapbox-gl';
import { DECIMAL_DEGREES_PRECISION } from '../../../common/constants';
import type { MapExtent } from '../../../common/descriptor_types';

export function boundsToExtent(bounds: LngLatBounds): MapExtent {
  return {
    minLon: round(bounds.getWest(), DECIMAL_DEGREES_PRECISION),
    minLat: round(bounds.getSouth(), DECIMAL_DEGREES_PRECISION),
    maxLon: round(bounds.getEast(), DECIMAL_DEGREES_PRECISION),
    maxLat: round(bounds.getNorth(), DECIMAL_DEGREES_PRECISION),
  };
}
