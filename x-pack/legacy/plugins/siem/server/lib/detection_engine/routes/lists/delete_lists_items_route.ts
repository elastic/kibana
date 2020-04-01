/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_ITEM_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../utils';
import {
  DeleteListsItemsSchema,
  deleteListsItemsSchema,
} from '../schemas/request/delete_lists_items_schema';
import { deleteListItem } from '../../lists/delete_list_item';
import { deleteListItemByValue } from '../../lists/delete_list_item_by_value';

export const deleteListsItemsRoute = (router: IRouter): void => {
  router.delete(
    {
      path: DETECTION_ENGINE_LIST_ITEM_URL,
      validate: {
        query: buildRouteValidationIoTS<DeleteListsItemsSchema>(deleteListsItemsSchema),
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
          const deleted = await deleteListItem({
            id,
            clusterClient,
            listsItemsIndex,
          });
          if (deleted == null) {
            // TODO: More specifics on which item was not found
            return siemResponse.error({
              statusCode: 404,
              body: `list_id: "${id}" item not found`,
            });
          } else {
            // TODO: outbound validation
            return response.ok({ body: deleted });
          }
        } else if (listId != null) {
          const deleted = await deleteListItemByValue({
            ip,
            listId,
            clusterClient,
            listsItemsIndex,
          });
          if (deleted == null) {
            // TODO: More specifics on which item was not found
            return siemResponse.error({
              statusCode: 404,
              body: `list_id: "${id}" item not found`,
            });
          } else {
            // TODO: outbound validation
            return response.ok({ body: deleted });
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
