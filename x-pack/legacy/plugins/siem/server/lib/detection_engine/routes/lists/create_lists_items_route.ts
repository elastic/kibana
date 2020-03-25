/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_ITEM_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../utils';
import { listsItemsSchema, ListsItemsSchema } from '../schemas/request/lists_items_schema';
import { createListItem } from '../../lists/create_list_item';
import { getList } from '../../lists/get_list';
import { getListItem } from '../../lists/get_list_item';

export const createListsItemsRoute = (router: IRouter): void => {
  router.post(
    {
      path: DETECTION_ENGINE_LIST_ITEM_URL,
      validate: {
        body: buildRouteValidationIoTS<ListsItemsSchema>(listsItemsSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const { list_id: listId, ip } = request.body;
      const siemResponse = buildSiemResponse(response);
      try {
        const savedObjectsClient = context.core.savedObjects.client;
        const savedList = await getList({ listId, savedObjectsClient });
        if (savedList == null) {
          return siemResponse.error({
            statusCode: 404,
            body: `list_id: "${listId}" does not exist`,
          });
        } else {
          const savedListItem = await getListItem({ listId, ip, savedObjectsClient });
          if (savedListItem != null) {
            return siemResponse.error({
              statusCode: 409,
              body: `list_id: "${listId}" already contains list value`,
            });
          } else {
            const listItem = await createListItem({ listId, ip, savedObjectsClient });
            // TODO: Transform and return this result set
            return response.ok({ body: listItem });
          }
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
