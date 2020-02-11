/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import geojsonvt from 'geojson-vt';
import vtpbf from 'vt-pbf';
import _ from 'lodash';
import {
  FEATURE_ID_PROPERTY_NAME,
  MVT_SOURCE_ID,
  KBN_TOO_MANY_FEATURES_PROPERTY,
} from '../../common/constants';

export async function getTile({
  server,
  request,
  indexPattern,
  geometryFieldName,
  x,
  y,
  z,
  requestBody = {},
}) {
  const polygon = toBoundingBox(x, y, z);

  let resultFeatures;

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

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      // server.log('info', JSON.stringify(esQuery));
      const countQuery = {
        index: indexPattern,
        body: {
          query: requestBody.query,
        },
      };

      // console.time('es-count')
      const beforeCount = Date.now();
      const countResult = await callWithRequest(request, 'count', countQuery);
      server.log('info', `count: ${Date.now() - beforeCount}`);
      // server.log('info', `count`);
      // server.log('info', countResult, requestBody.size);

      if (countResult.count > requestBody.size) {
        // server.log('info', 'do NOT do search');
        resultFeatures = [
          {
            type: 'Feature',
            properties: {
              [KBN_TOO_MANY_FEATURES_PROPERTY]: true,
            },
            geometry: polygon,
          },
        ];
      } else {
        // server.log('info', 'do search');
        const beforeSearch = Date.now();
        result = await callWithRequest(request, 'search', esQuery);
        server.log('info', `search ${Date.now() - beforeSearch}`);

        // server.log('info', `result length ${result.hits.hits.length}`);

        const feats = result.hits.hits.map(hit => {
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
          } else if (geometry.type === 'point' || geometry.type === 'Point') {
            geomType = 'Point';
          } else if (geometry.type === 'MultiPoint' || geomType.type === 'multipoint') {
            geomType = 'MultiPoint';
          } else {
            return null;
          }
          const geometryGeoJson = {
            type: geomType,
            coordinates: geometry.coordinates,
          };

          const firstFields = {};
          if (hit.fields) {
            const fields = hit.fields;
            Object.keys(fields).forEach(key => {
              const value = fields[key];
              if (Array.isArray(value)) {
                firstFields[key] = value[0];
              } else {
                firstFields[key] = value;
              }
            });
          }

          const properties = {
            ...hit._source,
            ...firstFields,
            _id: hit._id,
            _index: hit._index,
            [FEATURE_ID_PROPERTY_NAME]: hit._id,
            [KBN_TOO_MANY_FEATURES_PROPERTY]: false,
          };
          delete properties[geometryFieldName];

          return {
            type: 'Feature',
            id: hit._id,
            geometry: geometryGeoJson,
            properties: properties,
          };
        });

        resultFeatures = feats.filter(f => !!f);
      }
    } catch (e) {
      server.log('info', e.message);
      throw e;
    }

    const featureCollection = {
      features: resultFeatures,
      type: 'FeatureCollection',
    };

    // server.log('info', `feature length ${featureCollection.features.length}`);

    const beforeTile = Date.now();
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
    server.log('info', `tile ${Date.now() - beforeTile}`);

    if (tile) {
      const beforeBuffer = Date.now();

      const pbf = vtpbf.fromGeojsonVt({ [MVT_SOURCE_ID]: tile }, { version: 2 });
      const buffer = Buffer.from(pbf);
      server.log('info', `buffer ${Date.now() - beforeBuffer}`);

      // server.log('info', `bytelength: ${buffer.byteLength}`);

      return buffer;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}

export async function getGridTile({
  server,
  size,
  request,
  indexPattern,
  geometryFieldName,
  aggNames,
  x,
  y,
  z,
  fields = [],
  requestBody = {},
}) {
  // server.log('info', { indexPattern, aggNames, requestBody, geometryFieldName, x, y, z, fields });
  const polygon = toBoundingBox(x, y, z);

  const wLon = tile2long(x, z);
  const sLat = tile2lat(y + 1, z);
  const eLon = tile2long(x + 1, z);
  const nLat = tile2lat(y, z);

  try {
    let result;
    try {
      const geoBoundingBox = {
        geo_bounding_box: {
          [geometryFieldName]: {
            top_left: [wLon, nLat],
            bottom_right: [eLon, sLat],
          },
        },
      };

      requestBody.query.bool.filter.push(geoBoundingBox);

      requestBody.aggs.grid.geotile_grid.precision = Math.min(z + 6, 24);

      const esQuery = {
        index: indexPattern,
        body: requestBody,
      };
      // server.log('info', JSON.stringify(esQuery));

      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const beforeAgg = Date.now();
      result = await callWithRequest(request, 'search', esQuery);
      server.log('info', `geotile_search ${Date.now() - beforeAgg}`);

      // server.log('info', JSON.stringify(result));
    } catch (e) {
      server.log('warning', e.message);
      throw e;
    }

    const beforeTile = Date.now();
    const ffeats = [];
    result.aggregations.grid.buckets.forEach(bucket => {
      const feature = {
        type: 'Feature',
        properties: {},
        geometry: null,
      };

      for (let i = 0; i < aggNames.length; i++) {
        const aggName = aggNames[i];
        if (aggName === 'doc_count') {
          feature.properties[aggName] = bucket[aggName];
        } else if (aggName === 'grid') {
          //do nothing
        } else {
          feature.properties[aggName] = bucket[aggName].value;
        }
      }

      feature.properties[KBN_TOO_MANY_FEATURES_PROPERTY] = false;

      const centroid = {
        type: 'Point',
        coordinates: [parseFloat(bucket['1'].location.lon), parseFloat(bucket['1'].location.lat)],
      };

      feature.geometry = centroid;

      ffeats.push(feature);
    });

    const featureCollection = {
      features: ffeats,
      type: 'FeatureCollection',
    };

    // server.log('info', `feature length ${featureCollection.features.length}`);

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
    server.log('info', `tile ${Date.now() - beforeTile}`);

    if (tile) {
      const beforeBuff = Date.now();
      const pbf = vtpbf.fromGeojsonVt({ [MVT_SOURCE_ID]: tile }, { version: 2 });
      const buffer = Buffer.from(pbf);
      server.log('info', `buffer ${Date.now() - beforeBuff}`);

      return buffer;
    } else {
      return null;
    }
  } catch (e) {
    return null;
  }
}

function toBoundingBox(x, y, z) {
  const wLon = tile2long(x, z);
  const sLat = tile2lat(y + 1, z);
  const eLon = tile2long(x + 1, z);
  const nLat = tile2lat(y, z);

  const polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [wLon, sLat],
        [wLon, nLat],
        [eLon, nLat],
        [eLon, sLat],
        [wLon, sLat],
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
