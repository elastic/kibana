/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as jsts from 'jsts';
import rewind from 'geojson-rewind';

export function geoJsonCleanAndValidate(feature) {

  const reader = new jsts.io.GeoJSONReader();
  const jstsGeometry = reader.read(feature);

  // Pass features for cleaning
  const cleanedGeometry = cleanGeometry(jstsGeometry);

  // Pass entire geoJson object for winding
  // JSTS does not enforce winding order, wind in clockwise order
  const correctlyWindedGeometry = cleanedGeometry
    && rewind(cleanedGeometry, false);

  return {
    ...feature,
    geometry: correctlyWindedGeometry
  };
}

export function cleanGeometry({ geometry }) {
  const writer = new jsts.io.GeoJSONWriter();
  if (!geometry) {
    return;
  }
  const cleanedGeometry = (geometry.isSimple() || geometry.isValid())
    ? writer.write(geometry)
    : writer.write(geometry.buffer(0));
  return cleanedGeometry;
}
