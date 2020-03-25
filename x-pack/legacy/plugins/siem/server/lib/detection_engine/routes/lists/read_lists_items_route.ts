/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_ITEM_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../utils';
import { getListItem } from '../../lists/get_list_item';
import {
  ListsItemsQuerySchema,
  listsItemsQuerySchema,
} from '../schemas/request/lists_items_query_schema';

export const readListsItemsRoute = (router: IRouter): void => {
  router.get(
    {
      path: DETECTION_ENGINE_LIST_ITEM_URL,
      validate: {
        query: buildRouteValidationIoTS<ListsItemsQuerySchema>(listsItemsQuerySchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const { list_id: listId, ip } = request.query;
      const siemResponse = buildSiemResponse(response);
      try {
        const savedObjectsClient = context.core.savedObjects.client;
        const listItem = await getListItem({ listId, ip, savedObjectsClient });
        if (listItem == null) {
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
