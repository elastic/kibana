/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_INDEX_URL } from '../../../../../common/constants';
import { transformError } from '../utils';
import { getIndexExists } from '../../index/get_index_exists';

export const readIndexRoute = (router: IRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_INDEX_URL,
      validate: false,
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      try {
        const clusterClient = context.core.elasticsearch.dataClient;
        const siemClient = context.siem.getSiemClient();

        const index = siemClient.signalsIndex;
        const indexExists = await getIndexExists(clusterClient.callAsCurrentUser, index);

        if (indexExists) {
          return response.ok({ body: { name: index } });
        } else {
          return response.notFound({
            body: 'index for this space does not exist',
          });
        }
      } catch (err) {
        const error = transformError(err);
        return response.customError({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
