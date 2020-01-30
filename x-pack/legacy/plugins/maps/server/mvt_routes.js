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
import rison from 'rison-node';

const ROOT = `/${GIS_API_PATH}`;

export function initMVTRoutes(server) {
  const esClient = new Client({ node: 'http://elastic:changeme@localhost:9200' });

  server.route({
    method: 'GET',
    path: `${ROOT}/${MVT_GETTILE_API_PATH}`,
    handler: async (request, h) => {
      const { server, query } = request;

      // server.log('warning', query);


      const indexPattern = query.indexPattern;


      const x = parseInt(query.x);
      const y = parseInt(query.y);
      const z = parseInt(query.z);

      const geometryFieldName = query.geometryFieldName;
      const fields = query.fields ? query.fields.split(',') : [];
      const size = parseInt(query.size) || 10000;

      const requestBodyDSL = rison.decode(query.requestBody);
      // server.log('info',requestBodyDSL);
      const tile = await getTile({
        server,
        esClient,
        size,
        geometryFieldName,
        fields,
        x,
        y,
        z,
        indexPattern,
        requestBody: requestBodyDSL
      });

      // server.log('info', tile);

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
