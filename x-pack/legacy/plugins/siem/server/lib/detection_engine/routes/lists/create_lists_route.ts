/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../utils';
import { createListsSchema, CreateListsSchema } from '../schemas/request/create_lists_schema';
import { createList } from '../../lists/create_list';
import { getList } from '../../lists/get_list';

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
      const siemResponse = buildSiemResponse(response);
      try {
        const { name, description, id } = request.body;
        const clusterClient = context.core.elasticsearch.dataClient;
        const siemClient = context.siem?.getSiemClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const listsIndex = siemClient.listsIndex;
        if (id != null) {
          const list = await getList({ id, clusterClient, listsIndex });
          if (list != null) {
            return siemResponse.error({
              statusCode: 409,
              body: `list id: "${id}" already exists`,
            });
          }
        }
        const list = await createList({ name, description, id, clusterClient, listsIndex });
        // TODO: outbound validation
        return response.ok({ body: list });
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
