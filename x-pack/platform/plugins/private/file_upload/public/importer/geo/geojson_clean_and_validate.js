/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as jsts from 'jsts';
import rewind from '@mapbox/geojson-rewind';

// The GeoJSON specification suggests limiting coordinate precision to six decimal places
// See https://datatracker.ietf.org/doc/html/rfc7946#section-11.2
// We can enforce rounding to six decimal places by setting the PrecisionModel scale
// scale = 10^n where n = maximum number of decimal places
const precisionModel = new jsts.geom.PrecisionModel(Math.pow(10, 6));
const geometryPrecisionReducer = new jsts.precision.GeometryPrecisionReducer(precisionModel);
geometryPrecisionReducer.setChangePrecisionModel(true);
const geoJSONReader = new jsts.io.GeoJSONReader();
const geoJSONWriter = new jsts.io.GeoJSONWriter();

export function geoJsonCleanAndValidate(feature) {
  let cleanedGeometry;
  // Attempts to clean geometry. If this fails, don't generate errors at this
  // point, these will be handled more accurately on write to ES with feedback
  // given to user
  try {
    const geometryReadResult = geoJSONReader.read(feature);
    cleanedGeometry = cleanGeometry(geometryReadResult);
  } catch (e) {
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

  // GeometryPrecisionReducer will automatically clean invalid geometries
  const geometryToWrite = geometryPrecisionReducer.reduce(geometry);
  return geoJSONWriter.write(geometryToWrite);
}
