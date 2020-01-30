/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import _ from 'lodash';
import { FEATURE_ID_PROPERTY_NAME } from '../../common/constants';

export async function getTile({
  esClient,
  server,
  indexPattern,
  size,
  geometryFieldName,
  x,
  y,
  z,
  fields = [],
  requestBody = {},
}) {
  server.log('info', { indexPattern, size, geometryFieldName, x, y, z, fields });
  const polygon = toBoundingBox(x, y, z);

  try {
    let result;
    try {
      const geoShapeFilter = {
        geo_shape: {
          [geometryFieldName]: {
            shape: polygon,
            relation: 'INTERSECTS',
          },
        },
      };

      requestBody.query.bool.filter.push(geoShapeFilter);

      const esQuery = {
        index: indexPattern,
        body: requestBody,
      };
      server.log('info', JSON.stringify(esQuery));
      result = await esClient.search(esQuery);
      server.log('result', JSON.stringify(result));
    } catch (e) {
      server.log('error', e.message);
      throw e;
    }

    server.log('info', `result length ${result.body.hits.hits.length}`);
    const feats = result.body.hits.hits.map(hit => {
      let geomType;
      const geometry = hit._source[geometryFieldName];
      if (geometry.type === 'polygon' || geometry.type === 'Polygon') {
        geomType = 'Polygon';
      } else if (geometry.type === 'multipolygon' || geometry.type === 'MultiPolygon') {
        geomType = 'MultiPolygon';
      } else if (geometry.type === 'linestring' || geometry.type === 'LineString') {
        geomType = 'LineString';
      } else if (geometry.type === 'multilinestring' || geometry.type === 'MultiLineString') {
        geomType = 'MultiLineString';
      } else {
        return null;
      }
      const geometryGeoJson = {
        type: geomType,
        coordinates: geometry.coordinates,
      };

      const firstFields = {};
      const fields = hit.fields;
      Object.keys(fields).forEach(key => {
        const value = fields[key];
        if (Array.isArray(value)) {
          firstFields[key] = value[0];
        } else {
          firstFields[key] = value;
        }
      });

      const properties = {
        ...hit._source,
        ...firstFields,
        _id: hit._id,
        _index: hit._index,
        [FEATURE_ID_PROPERTY_NAME]: hit._id,
      };
      delete properties[geometryFieldName];

      return {
        type: 'Feature',
        id: hit._id,
        geometry: geometryGeoJson,
        properties: properties,
      };
    });

    const ffeats = feats.filter(f => !!f);

    const featureCollection = {
      features: ffeats,
      type: 'FeatureCollection',
    };

    server.log('info', `feature length ${featureCollection.features.length}`);

    const tileIndex = geojsonvt(featureCollection, {
      maxZoom: 24, // max zoom to preserve detail on; can't be higher than 24
      tolerance: 3, // simplification tolerance (higher means simpler)
      extent: 4096, // tile extent (both width and height)
      buffer: 64, // tile buffer on each side
      debug: 0, // logging level (0 to disable, 1 or 2)
      lineMetrics: false, // whether to enable line metrics tracking for LineString/MultiLineString features
      promoteId: null, // name of a feature property to promote to feature.id. Cannot be used with `generateId`
      generateId: false, // whether to generate feature ids. Cannot be used with `promoteId`
      indexMaxZoom: 5, // max zoom in the initial tile index
      indexMaxPoints: 100000, // max number of points per tile in the index
    });
    const tile = tileIndex.getTile(z, x, y);

    if (tile) {
      const pbf = vtpbf.fromGeojsonVt({ geojsonLayer: tile }, { version: 2 });
      const buffer = Buffer.from(pbf);

      server.log('info', `bytelength: ${buffer.byteLength}`);

      return buffer;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}

function toBoundingBox(x, y, z) {
  const w_lon = tile2long(x, z);
  const s_lat = tile2lat(y + 1, z);
  const e_lon = tile2long(x + 1, z);
  const n_lat = tile2lat(y, z);

  const polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [w_lon, s_lat],
        [w_lon, n_lat],
        [e_lon, n_lat],
        [e_lon, s_lat],
        [w_lon, s_lat],
      ],
    ],
  };

  return polygon;
}

tile2long(0, 1);
tile2lat(1, 20);

function tile2long(x, z) {
  return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}
