/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as jsts from 'jsts';
import rewind from 'geojson-rewind';

const GeoJSONIO = (() => {
  let geoJSONReader;
  let geoJSONWriter;

  const createNewGeoJSONReader = () => new jsts.io.GeoJSONReader();
  const createNewGeoJSONWriter = () => new jsts.io.GeoJSONWriter();

  return {
    read: feature => {
      if (!geoJSONReader) {
        geoJSONReader = createNewGeoJSONReader();
      }
      return geoJSONReader.read(feature);
    },
    write: geometry => {
      if (!geoJSONWriter) {
        geoJSONWriter = createNewGeoJSONWriter();
      }
      return geoJSONWriter.write(geometry);
    }
  };
})();

export function geoJsonCleanAndValidate(feature) {

  const geometryReadResult = GeoJSONIO.read(feature);

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
    geometry: correctlyWindedGeometry
  };
}

export function cleanGeometry({ geometry }) {
  if (!geometry) {
    return null;
  }
  const geometryToWrite = (geometry.isSimple() || geometry.isValid())
    ? geometry
    : geometry.buffer(0);
  const cleanedGeometry = GeoJSONIO.write(geometryToWrite);

  return cleanedGeometry;
}
