/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, ScopedClusterClient } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_ITEM_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../utils';
import {
  importListsItemsQuerySchema,
  ImportListsItemsQuerySchema,
} from '../schemas/request/import_lists_items_query_schema';
import {
  importListsItemsSchema,
  ImportListsItemsSchema,
} from '../schemas/request/import_lists_items_schema';
import { writeLinesToBulkListItems } from '../../lists/write_lines_to_bulk_list_items';
import { getList } from '../../lists/get_list';
import { createList } from '../../lists/create_list';
import { ListsSchema } from '../schemas/response/lists_schema';
import { Type } from '../schemas/common/schemas';

export const importListsItemsRoute = (router: IRouter): void => {
  router.post(
    {
      path: `${DETECTION_ENGINE_LIST_ITEM_URL}/_import`,
      validate: {
        query: buildRouteValidationIoTS<ImportListsItemsQuerySchema>(importListsItemsQuerySchema),
        body: buildRouteValidationIoTS<ImportListsItemsSchema>(importListsItemsSchema),
      },
      options: {
        tags: ['access:siem'],
        body: {
          output: 'stream',
        },
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const { list_id: listId, type } = request.query;
        const clusterClient = context.core.elasticsearch.dataClient;
        const siemClient = context.siem?.getSiemClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const { listsIndex, listsItemsIndex } = siemClient;
        if (listId != null) {
          const list = await getList({ id: listId, clusterClient, listsIndex });
          if (list == null) {
            return siemResponse.error({
              statusCode: 409,
              body: `list id: "${listId}" does not exist`,
            });
          }
          await writeLinesToBulkListItems({
            listId,
            stream: request.body.file,
            clusterClient,
            listsItemsIndex,
            type: list.type,
          });
          return response.accepted({
            body: {
              acknowledged: true,
            },
          });
        } else if (type != null) {
          const { filename } = request.body.file.hapi;
          // TODO: Should we have a flag to prevent the same file from being uploaded multiple times?
          const list = await createListIfNotExists({ filename, clusterClient, listsIndex, type });
          await writeLinesToBulkListItems({
            listId: list.id,
            stream: request.body.file,
            clusterClient,
            listsItemsIndex,
            type: list.type,
          });
          return response.accepted({
            body: {
              acknowledged: true,
            },
          });
        } else {
          return siemResponse.error({
            body: 'Either type or list_id need to be defined in the query',
            statusCode: 400,
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

export const createListIfNotExists = async ({
  filename,
  clusterClient,
  listsIndex,
  type,
}: {
  type: Type;
  listsIndex: string;
  filename: string;
  clusterClient: Pick<ScopedClusterClient, 'callAsCurrentUser' | 'callAsInternalUser'>;
}): Promise<ListsSchema> => {
  const list = await getList({ id: filename, clusterClient, listsIndex });
  if (list == null) {
    const createdList = await createList({
      name: filename,
      description: `File uploaded from file system of ${filename}`,
      id: filename,
      clusterClient,
      listsIndex,
      type,
    });
    return createdList;
  } else {
    return list;
  }
};
