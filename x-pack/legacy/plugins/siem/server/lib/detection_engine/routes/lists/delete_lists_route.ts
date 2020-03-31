/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../utils';
import { deleteListsSchema, DeleteListsSchema } from '../schemas/request/delete_lists_schema';
import { deleteList } from '../../lists/delete_list';

// TODO: Have you added a specific deleteListsItemsRoute to delete a list item one at a time?

export const deleteListsRoute = (router: IRouter): void => {
  router.delete(
    {
      path: DETECTION_ENGINE_LIST_URL,
      validate: {
        query: buildRouteValidationIoTS<DeleteListsSchema>(deleteListsSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { id } = request.query;
        const clusterClient = context.core.elasticsearch.dataClient;
        const siemClient = context.siem.getSiemClient();
        const { listsIndex, listsItemsIndex } = siemClient;
        const deleted = await deleteList({ id, clusterClient, listsIndex, listsItemsIndex });
        if (deleted == null) {
          return siemResponse.error({
            statusCode: 404,
            body: `list_id: "${id}" not found`,
          });
        } else {
          // TODO: outbound validation
          return response.ok({ body: deleted });
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
