/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RENDER_AS } from './render_as';
import { getTileBoundingBox } from './geo_tile_utils';
import { EMPTY_FEATURE_COLLECTION } from '../../../../common/constants';

export function convertToGeoJson({ table, renderAs }) {

  if (!table || !table.rows) {
    return EMPTY_FEATURE_COLLECTION;
  }

  const geoGridColumn = table.columns.find(column => column.aggConfig.type.dslName === 'geotile_grid');
  if (!geoGridColumn) {
    return EMPTY_FEATURE_COLLECTION;
  }

  const metricColumns = table.columns.filter(column => {
    return column.aggConfig.type.type === 'metrics' && column.aggConfig.type.dslName !== 'geo_centroid';
  });
  const geocentroidColumn = table.columns.find(column => column.aggConfig.type.dslName === 'geo_centroid');
  if (!geocentroidColumn) {
    return EMPTY_FEATURE_COLLECTION;
  }

  const features = [];
  table.rows.forEach(row => {
    const gridKey = row[geoGridColumn.id];
    if (!gridKey) {
      return;
    }

    const properties = {};
    metricColumns.forEach(metricColumn => {
      properties[metricColumn.aggConfig.id] = row[metricColumn.id];
    });

    features.push({
      type: 'Feature',
      geometry: rowToGeometry({
        row,
        gridKey,
        geocentroidColumn,
        renderAs,
      }),
      id: gridKey,
      properties
    });
  });

  return {
    featureCollection: {
      type: 'FeatureCollection',
      features: features
    }
  };
}

function rowToGeometry({
  row,
  gridKey,
  geocentroidColumn,
  renderAs,
}) {
  const { top, bottom, right, left } = getTileBoundingBox(gridKey);

  if (renderAs === RENDER_AS.GRID) {
    return {
      type: 'Polygon',
      coordinates: [
        [
          [right, top],
          [left, top],
          [left, bottom],
          [right, bottom],
          [right, top],
        ]
      ]
    };
  }

  // see https://github.com/elastic/elasticsearch/issues/24694 for why clampGrid is used
  const pointCoordinates = [
    clampGrid(row[geocentroidColumn.id].lon, left, right),
    clampGrid(row[geocentroidColumn.id].lat, bottom, top)
  ];

  return {
    type: 'Point',
    coordinates: pointCoordinates
  };
}

function clampGrid(val, min, max) {
  if (val > max) val = max;
  else if (val < min) val = min;
  return val;
}
