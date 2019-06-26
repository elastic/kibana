/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const jsts = require('jsts');
import rewind from 'geojson-rewind';

export function geoJsonCleanAndValidate(parsedFile) {

  const reader = new jsts.io.GeoJSONReader();
  const geoJson = reader.read(parsedFile);
  const isSingleFeature = parsedFile.type === 'Feature';
  const features = isSingleFeature
    ? [{ ...geoJson }]
    : geoJson.features;

  // Pass features for cleaning
  const cleanedFeatures = cleanFeatures(features);

  // Put clean features back in geoJson object
  const cleanGeoJson = {
    ...parsedFile,
    ...(isSingleFeature
      ? cleanedFeatures[0]
      : { features: cleanedFeatures }
    ),
  };

  // Pass entire geoJson object for winding
  // JSTS does not enforce winding order, wind in clockwise order
  const correctlyWindedGeoJson = rewind(cleanGeoJson, false);
  return correctlyWindedGeoJson;
}

export function cleanFeatures(features) {
  const writer = new jsts.io.GeoJSONWriter();
  return features.map(({ id, geometry, properties }) => {
    const geojsonGeometry = (geometry.isSimple() || geometry.isValid())
      ? writer.write(geometry)
      : writer.write(geometry.buffer(0));
    return ({
      type: 'Feature',
      geometry: geojsonGeometry,
      ...(id ? { id } : {}),
      ...(properties ? { properties } : {}),
    });
  });
}
