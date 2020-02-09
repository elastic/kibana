/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as jsts from 'jsts';
import rewind from 'geojson-rewind';

const geoJSONReader = new jsts.io.GeoJSONReader();
const geoJSONWriter = new jsts.io.GeoJSONWriter();

export function geoJsonCleanAndValidate(feature) {
  const geometryReadResult = geoJSONReader.read(feature);

  const cleanedGeometry = cleanGeometry(geometryReadResult);

  // For now, return the feature unmodified
  // TODO: Consider more robust UI feedback and general handling
  // for features that fail cleaning and/or validation
  if (!cleanedGeometry) {
    return feature;
  }

  // JSTS does not enforce winding order, wind in clockwise order
  const correctlyWindedGeometry = rewind(cleanedGeometry, false);

  return {
    ...feature,
    geometry: correctlyWindedGeometry,
  };
}

export function cleanGeometry({ geometry }) {
  if (!geometry) {
    return null;
  }
  const geometryToWrite = geometry.isSimple() || geometry.isValid() ? geometry : geometry.buffer(0);
  return geoJSONWriter.write(geometryToWrite);
}
