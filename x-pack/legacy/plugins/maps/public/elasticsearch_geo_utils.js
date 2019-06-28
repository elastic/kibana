/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { parse } from 'wellknown';
import { decodeGeoHash } from 'ui/utils/decode_geo_hash';
import { DECIMAL_DEGREES_PRECISION, ES_GEO_FIELD_TYPE, GEO_JSON_TYPE } from '../common/constants';

/**
 * Converts Elasticsearch search results into GeoJson FeatureCollection
 *
 * @param {array} hits Elasticsearch search response hits array
 * @param {function} flattenHit Method to flatten hits._source and hits.fields into properties object.
 *   Should just be IndexPattern.flattenHit but wanted to avoid coupling this method to IndexPattern.
 * @param {string} geoFieldName Geometry field name
 * @param {string} geoFieldType Geometry field type ["geo_point", "geo_shape"]
 * @returns {number}
 */
export function hitsToGeoJson(hits, flattenHit, geoFieldName, geoFieldType) {
  const features = [];
  const tmpGeometriesAccumulator = [];

  for (let i = 0; i < hits.length; i++) {
    const properties = flattenHit(hits[i]);

    tmpGeometriesAccumulator.length = 0;//truncate accumulator
    if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
      geoPointToGeometry(properties[geoFieldName], tmpGeometriesAccumulator);
    } else if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_SHAPE) {
      geoShapeToGeometry(properties[geoFieldName], tmpGeometriesAccumulator);
    } else {
      const errorMessage = i18n.translate('xpack.maps.elasticsearch_geo_utils.unsupportedFieldTypeErrorMessage', {
        defaultMessage: 'Unsupported field type, expected: geo_shape or geo_point, you provided: {geoFieldType}',
        values: { geoFieldType }
      });
      throw new Error(errorMessage);
    }
    // don't include geometry field value in properties
    delete properties[geoFieldName];

    //create new geojson Feature for every individual geojson geometry.
    for (let j = 0; j < tmpGeometriesAccumulator.length; j++) {
      features.push({
        type: 'Feature',
        geometry: tmpGeometriesAccumulator[j],
        properties: properties
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features: features
  };
}

function pointGeometryFactory(lat, lon) {
  return {
    type: GEO_JSON_TYPE.POINT,
    coordinates: [lon, lat]
  };
}

export function geoPointToGeometry(value, accumulator) {
  if (!value) {
    return;
  }

  if (typeof value === 'string') {

    const commaSplit = value.split(',');
    let point;
    if (commaSplit.length === 1) {
      const geohash = decodeGeoHash(value);
      point = pointGeometryFactory(geohash.latitude[2], geohash.longitude[2]);
    } else {
      const lat = parseFloat(commaSplit[0]);
      const lon = parseFloat(commaSplit[1]);
      point = pointGeometryFactory(lat, lon);
    }
    accumulator.push(point);
    return;
  }

  if (typeof value === 'object' && _.has(value, 'lat') && _.has(value, 'lon')) {
    accumulator.push(pointGeometryFactory(value.lat, value.lon));
    return;
  }

  if (!Array.isArray(value)) {
    const errorMessage = i18n.translate('xpack.maps.elasticsearch_geo_utils.unsupportedGeoPointValueErrorMessage', {
      defaultMessage: `Unsupported geo_point value: {geoPointValue}`,
      values: {
        geoPointValue: value
      }
    });
    throw new Error(errorMessage);
  }

  if (value.length === 2
      && typeof value[0] === 'number'
      && typeof value[1] === 'number') {
    const lat = value[1];
    const lon = value[0];
    accumulator.push(pointGeometryFactory(lat, lon));
    return;
  }

  // Geo-point expressed as an array of values
  for (let i = 0; i < value.length; i++) {
    geoPointToGeometry(value[i], accumulator);
  }
}

export function convertESShapeToGeojsonGeometry(value) {

  const geoJson = {
    type: value.type,
    coordinates: value.coordinates
  };

  // https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-shape.html#input-structure
  // For some unknown compatibility nightmarish reason, Elasticsearch types are not capitalized the same as geojson types
  // For example: 'LineString' geojson type is 'linestring' in elasticsearch
  // Convert feature types to geojson spec values
  // Sometimes, the type in ES is capitalized correctly. Sometimes it is not. It depends on how the doc was ingested
  // The below is the correction in-place.
  switch (value.type) {
    case 'point':
      geoJson.type = GEO_JSON_TYPE.POINT;
      break;
    case 'linestring':
      geoJson.type = GEO_JSON_TYPE.LINE_STRING;
      break;
    case 'polygon':
      geoJson.type = GEO_JSON_TYPE.POLYGON;
      break;
    case 'multipoint':
      geoJson.type = GEO_JSON_TYPE.MULTI_POINT;
      break;
    case 'multilinestring':
      geoJson.type = GEO_JSON_TYPE.MULTI_LINE_STRING;
      break;
    case 'multipolygon':
      geoJson.type = GEO_JSON_TYPE.MULTI_POLYGON;
      break;
    case 'geometrycollection':
      geoJson.type = GEO_JSON_TYPE.GEOMETRY_COLLECTION;
      break;
    case 'envelope':
    case 'circle':
      const errorMessage = i18n.translate('xpack.maps.elasticsearch_geo_utils.convert.unsupportedGeometryTypeErrorMessage', {
        defaultMessage: `Unable to convert {geometryType} geometry to geojson, not supported`,
        values: {
          geometryType: geoJson.type
        }
      });
      throw new Error(errorMessage);
  }
  return geoJson;
}

function convertWKTStringToGeojson(value) {
  try {
    return parse(value);
  } catch (e) {
    const errorMessage = i18n.translate('xpack.maps.elasticsearch_geo_utils.wkt.invalidWKTErrorMessage', {
      defaultMessage: `Unable to convert {wkt} to geojson. Valid WKT expected.`,
      values: {
        wkt: value
      }
    });
    throw new Error(errorMessage);
  }
}


export function geoShapeToGeometry(value, accumulator) {

  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    // value expressed as an array of values
    for (let i = 0; i < value.length; i++) {
      geoShapeToGeometry(value[i], accumulator);
    }
    return;
  }

  let geoJson;
  if (typeof value === 'string') {
    geoJson = convertWKTStringToGeojson(value);
  } else {
    geoJson = convertESShapeToGeojsonGeometry(value);
  }

  accumulator.push(geoJson);
}

const POLYGON_COORDINATES_EXTERIOR_INDEX = 0;
const TOP_LEFT_INDEX = 0;
const BOTTOM_RIGHT_INDEX = 2;

export function createExtentFilter(mapExtent, geoFieldName, geoFieldType) {
  const safePolygon = convertMapExtentToPolygon(mapExtent);
  if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
    const verticies = safePolygon.coordinates[POLYGON_COORDINATES_EXTERIOR_INDEX];
    return {
      geo_bounding_box: {
        [geoFieldName]: {
          top_left: verticies[TOP_LEFT_INDEX],
          bottom_right: verticies[BOTTOM_RIGHT_INDEX]
        }
      }
    };
  } else if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_SHAPE) {
    return {
      geo_shape: {
        [geoFieldName]: {
          shape: safePolygon,
          relation: 'INTERSECTS'
        }
      }
    };
  } else {
    const errorMessage = i18n.translate('xpack.maps.elasticsearch_geo_utils.extent.unsupportedGeoFieldTypeErrorMessage', {
      defaultMessage: `Unsupported field type, expected: geo_shape or geo_point, you provided: {geoFieldType}`,
      values: { geoFieldType }
    });
    throw new Error(errorMessage);
  }
}


export function createExtentFilterWithMeta(mapExtent, indexPatternId, geoFieldName, geoFieldType) {

  const roundedExtent = {
    minLon: _.round(mapExtent.minLon, DECIMAL_DEGREES_PRECISION),
    minLat: _.round(mapExtent.minLat, DECIMAL_DEGREES_PRECISION),
    maxLon: _.round(mapExtent.maxLon, DECIMAL_DEGREES_PRECISION),
    maxLat: _.round(mapExtent.maxLat, DECIMAL_DEGREES_PRECISION)
  };

  const filter = createExtentFilter(roundedExtent, geoFieldName, geoFieldType);
  filter.meta = {
    negate: false,
    index: indexPatternId,
    alias: i18n.translate('xpack.maps.elasticsearch_geo_utils.extentFilter.aliasTitle', {
      defaultMessage: `extent at {coordinate}`,
      values: {
        coordinate: `[${roundedExtent.minLon}, ${roundedExtent.minLat}, ${roundedExtent.maxLon}, ${roundedExtent.maxLat}]`
      }
    })
  };
  return filter;
}

export function createShapeFilterWithMeta(geojsonPolygon, indexPatternId, geoFieldName, geoFieldType) {

  const filter = {
    meta: {
      negate: false,
      index: indexPatternId,
      alias: i18n.translate('xpack.maps.elasticsearch_geo_utils.shapeFilter.aliasTitle', {
        defaultMessage: `shape at {coordinate}`,
        values: {
          // eslint-disable-next-line max-len
          coordinate: `${_.round(geojsonPolygon.coordinates[0][0][0], DECIMAL_DEGREES_PRECISION)}, ${_.round(geojsonPolygon.coordinates[0][0][1], DECIMAL_DEGREES_PRECISION)}`
        }
      })
    }
  };

  if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_POINT) {
    const pointsArray  = geojsonPolygon.coordinates[0].map(coordinatePair => {
      return {
        lon: _.round(coordinatePair[0], DECIMAL_DEGREES_PRECISION),
        lat: _.round(coordinatePair[1], DECIMAL_DEGREES_PRECISION)
      };
    });
    filter.geo_polygon = {
      ignore_unmapped: true,
      [geoFieldName]: {
        points: pointsArray
      }
    };
  } else if (geoFieldType === ES_GEO_FIELD_TYPE.GEO_SHAPE) {
    const geojsonCoordinateArray  = geojsonPolygon.coordinates[0].map(coordinatePair => {
      return [_.round(coordinatePair[0], DECIMAL_DEGREES_PRECISION), _.round(coordinatePair[1], DECIMAL_DEGREES_PRECISION)];
    });
    filter.geo_shape = {
      ignore_unmapped: true,
      [geoFieldName]: {
        shape: {
          type: 'Polygon',
          coordinates: [geojsonCoordinateArray]
        },
        relation: 'INTERSECTS'
      }
    };
  } else {
    const errorMessage = i18n.translate('xpack.maps.elasticsearch_geo_utils.shape.unsupportedGeoFieldTypeErrorMessage', {
      defaultMessage: `Unsupported field type, expected: geo_shape or geo_point, you provided: {geoFieldType}`,
      values: { geoFieldType }
    });
    throw new Error(errorMessage);
  }
  return filter;
}



function formatEnvelopeAsPolygon({ maxLat, maxLon, minLat, minLon }) {
  // GeoJSON mandates that the outer polygon must be counterclockwise to avoid ambiguous polygons
  // when the shape crosses the dateline
  const left = minLon;
  const right = maxLon;
  const top = maxLat > 90 ? 90 : maxLat;
  const bottom = minLat < -90 ? -90 : minLat;
  const topLeft = [left, top];
  const bottomLeft = [left, bottom];
  const bottomRight = [right, bottom];
  const topRight = [right, top];
  return {
    'type': 'polygon',
    'coordinates': [
      [ topLeft, bottomLeft, bottomRight, topRight, topLeft ]
    ]
  };
}

/*
 * Convert map bounds to polygon
 */
export function convertMapExtentToPolygon({ maxLat, maxLon, minLat, minLon }) {
  const lonDelta = maxLon - minLon;
  if (lonDelta >= 360) {
    return formatEnvelopeAsPolygon({
      maxLat,
      maxLon: 180,
      minLat,
      minLon: -180,
    });
  }

  if (maxLon > 180) {
    // bounds cross dateline east to west
    const overlapWestOfDateLine = maxLon - 180;
    return formatEnvelopeAsPolygon({
      maxLat,
      maxLon: -180 + overlapWestOfDateLine,
      minLat,
      minLon,
    });
  }

  if (minLon < -180) {
    // bounds cross dateline west to east
    const overlapEastOfDateLine = Math.abs(minLon) - 180;
    return formatEnvelopeAsPolygon({
      maxLat,
      maxLon,
      minLat,
      minLon: 180 - overlapEastOfDateLine,
    });
  }

  return formatEnvelopeAsPolygon({ maxLat, maxLon, minLat, minLon });
}
