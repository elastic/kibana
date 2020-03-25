/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../utils';
import { createListsSchema, CreateListsSchema } from '../schemas/request/create_lists_schema';
import { getListByListId } from '../../lists/get_list_by_list_id';
import { createList } from '../../lists/create_list';

export const createListsRoute = (router: IRouter): void => {
  router.post(
    {
      path: DETECTION_ENGINE_LIST_URL,
      validate: {
        body: buildRouteValidationIoTS<CreateListsSchema>(createListsSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const { name, description, list_id: listId } = request.body;
      const siemResponse = buildSiemResponse(response);
      try {
        const savedObjectsClient = context.core.savedObjects.client;
        const savedList = await getListByListId({ listId, savedObjectsClient });
        if (savedList != null) {
          return siemResponse.error({
            statusCode: 409,
            body: `list_id: "${listId}" already exists`,
          });
        } else {
          const list = await createList({ name, description, listId, savedObjectsClient });
          // TODO: Transform and check the list on exit as well as validate it
          return response.ok({ body: list });
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
