/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../common/constants';
import { createIndex } from '../alerts/create_index';

// TODO: The schema
// import { createRulesSchema } from './schemas';

import { ServerFacade, RequestFacade } from '../../../types';
import { transformError } from './utils';

export const createCreateIndexRoute = (server: ServerFacade): Hapi.ServerRoute => {
  return {
    method: 'POST',
    path: DETECTION_ENGINE_INDEX_URL,
    options: {
      tags: ['access:siem'],
      validate: {
        options: {
          abortEarly: false,
        },
        // payload: createRulesSchema, TODO: The Schema
      },
    },
    async handler(request: RequestFacade, headers) {
      const spaceId = server.plugins.spaces.getSpaceId(request);
      const index = `.signals-${spaceId}`;
      console.log('my space id is:', spaceId);
      try {
        console.log('----> create_index_route handler reached');
        const elasticsearch = request.server.plugins.elasticsearch;
        const { callWithRequest } = elasticsearch.getCluster('data');

        const returnData = await callWithRequest(request, 'search', {
          index: '.siem-signals-frank-hassanabad',
          body: {
            query: {
              match_all: {},
            },
          },
        });
        // console.log('return data is:', JSON.stringify(returnData, null, 2));
        const createdIndex = createIndex();

        const returnData2 = await callWithRequest(request, 'indices.getMapping', {
          index: '.siem-signals-frank-hassanabad',
        });
        // console.log('return data2 is:', JSON.stringify(returnData2, null, 2));

        // _ilm/policy/auditbeat-8.0.0
        // GET /.siem-signals/_ilm/explain
        const returnData3 = await callWithRequest(request, 'transport.request', {
          path: '_ilm/policy/auditbeat-8.0.0',
          method: 'GET',
        });
        console.log('return data3 is:', JSON.stringify(returnData3, null, 2));

        // check if the index exists and if it does exit
        // If the index does not exist then:
        //    Check if the policy exists. If it does not then
        //       create the policy as it does not exist
        //    Create the index and apply the policy and mappings to the index
        //    return (done)
        // else
        //     return error as the index already exists
        // Get the policy to see if exists
        // If it does not exist, create the policy

        // Create the index

        return createdIndex;
      } catch (err) {
        return transformError(err);
      }
    },
  };
};

export const createIndexRoute = (server: ServerFacade) => {
  server.route(createCreateIndexRoute(server));
};
