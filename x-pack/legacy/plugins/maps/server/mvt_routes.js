/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GIS_API_PATH, MVT_GETTILE_API_PATH, MVT_GETGRIDTILE_API_PATH } from '../common/constants';
import { getTile, getGridTile } from './mvt/get_tile';
import rison from 'rison-node';

const ROOT = `/${GIS_API_PATH}`;

export function initMVTRoutes(server) {

  server.route({
    method: 'GET',
    path: `${ROOT}/${MVT_GETTILE_API_PATH}`,
    handler: async (request, h) => {
      const { server, query } = request;

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
        request,
        size,
        geometryFieldName,
        fields,
        x,
        y,
        z,
        indexPattern,
        requestBody: requestBodyDSL,
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
    },
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/${MVT_GETGRIDTILE_API_PATH}`,
    handler: async (request, h) => {
      const { server, query } = request;

      const indexPattern = query.indexPattern;

      const x = parseInt(query.x);
      const y = parseInt(query.y);
      const z = parseInt(query.z);

      const geometryFieldName = query.geometryFieldName;
      const fields = query.fields ? query.fields.split(',') : [];
      const size = parseInt(query.size) || 10000;

      const requestBodyDSL = rison.decode(query.requestBody);
      // server.log('info',requestBodyDSL);
      const tile = await getGridTile({
        server,
        request,
        aggNames: query.aggNames.split(','),
        size,
        geometryFieldName,
        fields,
        x,
        y,
        z,
        indexPattern,
        requestBody: requestBodyDSL,
      });

      if (!tile) {
        return null;
      }
      let response = h.response(tile);
      response = response.bytes(tile.length);
      response = response.header('Content-Disposition', 'inline');
      response.header('Content-Type', 'application/x-protobuf');
      response = response.encoding('binary');

      return response;
    },
  });
}
