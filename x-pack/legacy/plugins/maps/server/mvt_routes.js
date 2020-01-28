/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EMS_FILES_API_PATH,
  EMS_FILES_DEFAULT_JSON_PATH,
  GIS_API_PATH,
  MVT_GETTILE_API_PATH,
} from '../common/constants';
import fetch from 'node-fetch';
import Boom from 'boom';
import { Client } from '@elastic/elasticsearch';
import { getTile } from './mvt/get_tile';

const ROOT = `/${GIS_API_PATH}`;

export function initMVTRoutes(server) {
  const esClient = new Client({ node: 'http://elastic:changeme@localhost:9200' });

  server.route({
    method: 'GET',
    path: `${ROOT}/${MVT_GETTILE_API_PATH}`,
    handler: async (request, h) => {
      const { server, query } = request;
      // const serverConfig = server.config();

      server.log('warning', 'hallo');

      // const esQuery = {
      //   index: 'kibana_sample_data_logs',
      //   body: {},
      // };
      // const results = await esClient.search(esQuery);

      const indexPattern = query.indexPattern;

      // http://localhost:8080/?x=133&y=198&z=9&index=ky_roads&geometry=geometry&size=10000&fields=fclass
// http://localhost:8080/?x=270&y=395&z=10&index=ky_roads&geometry=geometry&size=10000&fields=fclass


      //http://localhost:8080/?x=16&y=25&z=6&index=ky_roads&geometry=geometry&size=10000&fields=fclass
      // getTile ky_roads 10000 geometry 16 25 6 [ 'fclass' ]
      // includes [ 'fclass', 'geometry', '_id' ]
      // esquery { index: 'ky_roads',
      //   body:
      //   { size: 10000,
      //     _source: { includes: [Array] },
      //     stored_fields: [ 'geometry' ],
      //       query: { bool: [Object] } } }
      // esquery: 164.953ms
      // { _index: 'ky_roads',
      //   _id: '2pVA1G8B3ZwlEckSf2yE',
      //   _score: 0,
      //   _source:
      //   { fclass: 'residential',
      //     geometry: { coordinates: [Array], type: 'MultiLineString' } } }
      // feature length 2479
      // prep: 3.591ms
      // cut: 39.516ms
      // bufferize: 9.151ms
      // bytelength 20250

      const x = parseInt(query.x);
      const y = parseInt(query.y);
      const z = parseInt(query.z);

      // console.log('qd', queryData);

      const geometryFieldName = query.geometryFieldName;
      const fields = query.fields ? query.fields.split(',') : [];
      const size = parseInt(query.size) || 10000;

      const tile = await getTile({
        server,
        esClient,
        size,
        geometryFieldName,
        fields,
        x,
        y,
        z,
        indexPattern
      });

      server.log('info', tile);

      if (!tile) {
        return null;
      }
      let response = h.response(tile);
      response = response.bytes(tile.length);
      response = response.header('Content-Disposition', 'inline');
      response.header('Content-Type', 'application/x-protobuf');
      response = response.encoding('binary');

      return response;
      // return {
      //   q: request.query,
      // };
    },
  });
}
