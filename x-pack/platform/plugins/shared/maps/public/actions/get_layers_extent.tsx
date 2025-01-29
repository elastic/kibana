/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import bbox from '@turf/bbox';
import { multiPoint } from '@turf/helpers';
import { MapExtent } from '../../common/descriptor_types';
import { turfBboxToBounds } from '../../common/elasticsearch_util';
import { ILayer } from '../classes/layers/layer';
import type { DataRequestContext } from './data_request_actions';
import { DataRequestAbortError } from '../classes/util/data_request';

export async function getLayersExtent(
  layers: ILayer[],
  getDataRequestContext: (layerId: string) => DataRequestContext
): Promise<MapExtent | null> {
  if (!layers.length) {
    return null;
  }

  const boundsPromises = layers.map(async (layer: ILayer) => {
    if (!(await layer.isFittable())) {
      return null;
    }
    return layer.getBounds(getDataRequestContext);
  });

  let bounds;
  try {
    bounds = await Promise.all(boundsPromises);
  } catch (error) {
    if (!(error instanceof DataRequestAbortError)) {
      // eslint-disable-next-line no-console
      console.warn(
        'Unhandled getBounds error for layer. Only DataRequestAbortError should be surfaced',
        error
      );
    }
    // new fitToDataBounds request has superseded this thread of execution. Results no longer needed.
    return null;
  }

  const corners = [];
  for (let i = 0; i < bounds.length; i++) {
    const b = bounds[i];

    // filter out undefined bounds (uses Infinity due to turf responses)
    if (
      b === null ||
      b.minLon === Infinity ||
      b.maxLon === Infinity ||
      b.minLat === -Infinity ||
      b.maxLat === -Infinity
    ) {
      continue;
    }

    corners.push([b.minLon, b.minLat]);
    corners.push([b.maxLon, b.maxLat]);
  }

  return corners.length ? turfBboxToBounds(bbox(multiPoint(corners))) : null;
}
