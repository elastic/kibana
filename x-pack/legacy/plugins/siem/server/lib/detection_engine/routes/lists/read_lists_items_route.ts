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
import { getListItemsByValues } from '../../lists/get_list_items_by_values';
import { getListItem } from '../../lists/get_list_item';

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
        const { id, list_id: listId, ip } = request.query;
        const clusterClient = context.core.elasticsearch.dataClient;
        const siemClient = context.siem?.getSiemClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const { listsItemsIndex } = siemClient;
        if (id != null) {
          const listItem = await getListItem({
            id,
            clusterClient,
            listsItemsIndex,
          });
          if (listItem == null) {
            return siemResponse.error({
              statusCode: 404,
              body: `id: "${id}" item does not exist`,
            });
          } else {
            // TODO: outbound validation
            // TODO: Should we return this as an array since the other value below can be an array?
            return response.ok({ body: listItem });
          }
        } else if (listId != null) {
          const listItems = await getListItemsByValues({
            listId,
            ips: ip != null ? [ip] : [],
            clusterClient,
            listsItemsIndex,
          });
          if (!listItems.length) {
            // TODO: More specific error message that figures out which item value does not exist
            return siemResponse.error({
              statusCode: 404,
              body: `list_id: "${listId}" item does not exist`,
            });
          } else {
            // TODO: outbound validation
            return response.ok({ body: listItems });
          }
        } else {
          return siemResponse.error({
            statusCode: 400,
            body: `Either "list_id" or "id" needs to be defined in the request`,
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
