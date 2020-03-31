/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_ITEM_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../utils';
import {
  ReadListsItemsSchema,
  readListsItemsSchema,
} from '../schemas/request/read_lists_items_schema';
import { getListItemByValue } from '../../lists/get_list_item_by_value';

export const readListsItemsRoute = (router: IRouter): void => {
  router.get(
    {
      path: DETECTION_ENGINE_LIST_ITEM_URL,
      validate: {
        query: buildRouteValidationIoTS<ReadListsItemsSchema>(readListsItemsSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        // TODO: Make getting list_items by their id possible and not just their value
        const { list_id: listId, ip } = request.query;
        const clusterClient = context.core.elasticsearch.dataClient;
        const siemClient = context.siem?.getSiemClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const { listsItemsIndex } = siemClient;
        const listItem = await getListItemByValue({ listId, ip, clusterClient, listsItemsIndex });
        if (listItem == null) {
          // TODO: More specific error message that figures out which item value does not exist
          return siemResponse.error({
            statusCode: 404,
            body: `list_id: "${listId}" item does not exist`,
          });
        } else {
          // TODO: outbound validation
          return response.ok({ body: listItem });
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
