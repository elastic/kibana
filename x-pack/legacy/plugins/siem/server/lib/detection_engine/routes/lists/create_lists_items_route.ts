/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_ITEM_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../utils';
import {
  createListsItemsSchema,
  CreateListsItemsSchema,
} from '../schemas/request/create_lists_items_schema';
import { createListItem } from '../../lists/create_list_item';
import { getList } from '../../lists/get_list';
import { getListItemByValue } from '../../lists/get_list_item_by_value';

export const createListsItemsRoute = (router: IRouter): void => {
  router.post(
    {
      path: DETECTION_ENGINE_LIST_ITEM_URL,
      validate: {
        body: buildRouteValidationIoTS<CreateListsItemsSchema>(createListsItemsSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id, list_id: listId, ip } = request.body;
        const clusterClient = context.core.elasticsearch.dataClient;
        const siemClient = context.siem.getSiemClient();
        const { listsIndex, listsItemsIndex } = siemClient;
        const list = await getList({ id: listId, clusterClient, listsIndex });
        if (list == null) {
          return siemResponse.error({
            statusCode: 404,
            body: `list id: "${listId}" does not exist`,
          });
        } else {
          const listItem = await getListItemByValue({
            listId,
            ip,
            clusterClient,
            listsItemsIndex,
          });
          if (listItem != null) {
            return siemResponse.error({
              statusCode: 409,
              // TODO: Improve this error message by providing which list value
              body: `list_id: "${listId}" already contains the given list value`,
            });
          } else {
            const createdListItem = await createListItem({
              id,
              listId,
              ip,
              clusterClient,
              listsItemsIndex,
            });
            // TODO: Transform and return this result set
            return response.ok({ body: createdListItem });
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
