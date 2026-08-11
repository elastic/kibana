/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RENDER_AS } from '../constants';

export function getGeoGridRequestType(mapType: string): RENDER_AS {
  const mt = mapType.toLowerCase();
  if (mt === 'heatmap') return RENDER_AS.HEATMAP;
  if (mt === 'shaded geohash grid') return RENDER_AS.GRID;
  return RENDER_AS.POINT;
}
