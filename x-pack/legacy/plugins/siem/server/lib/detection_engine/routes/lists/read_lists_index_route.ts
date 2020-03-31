/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_INDEX } from '../../../../../common/constants';
import { transformError, buildSiemResponse } from '../utils';
import { getIndexExists } from '../../index/get_index_exists';

export const readListsIndexRoute = (router: IRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_LIST_INDEX,
      validate: false,
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const clusterClient = context.core.elasticsearch.dataClient;
        const siemClient = context.siem.getSiemClient();

        const { listsIndex, listsItemsIndex } = siemClient;
        const listsIndexExists = await getIndexExists(clusterClient.callAsCurrentUser, listsIndex);
        const listsItemsIndexExists = await getIndexExists(
          clusterClient.callAsCurrentUser,
          listsItemsIndex
        );

        if (listsIndexExists || listsItemsIndexExists) {
          return response.ok({
            body: { lists_index: listsIndexExists, lists_items_index: listsItemsIndexExists },
          });
        } else if (!listsIndexExists && listsItemsIndexExists) {
          return siemResponse.error({
            statusCode: 404,
            body: `index ${listsIndex} does not exist`,
          });
        } else if (!listsItemsIndexExists && listsIndexExists) {
          return siemResponse.error({
            statusCode: 404,
            body: `index ${listsItemsIndex} does not exist`,
          });
        } else {
          return siemResponse.error({
            statusCode: 404,
            body: `index ${listsIndex} and index ${listsItemsIndex} does not exist`,
          });
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
