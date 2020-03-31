/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../../src/core/server';
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
        // TODO: Implement type and make it default to string
        // TODO: Make list_id optional and default to the file name with the upload
        // TODO: Make an overwrite flag and set its default to false and implement overwrite
        // TODO: Use "type" for the data type from the request.query for what type this is being imported into
        // const { filename } = request.body.file.hapi;
        // const fileExtension = extname(filename).toLowerCase();

        const { list_id: listId } = request.query;
        const clusterClient = context.core.elasticsearch.dataClient;
        const siemClient = context.siem?.getSiemClient();
        if (!siemClient) {
          return siemResponse.error({ statusCode: 404 });
        }
        const { listsIndex, listsItemsIndex } = siemClient;
        const list = await getList({ id: listId, clusterClient, listsIndex });
        if (list == null) {
          return siemResponse.error({
            statusCode: 409,
            body: `list id: "${listId}" does not exist`,
          });
        }
        const linesProcessed = await writeLinesToBulkListItems({
          listId,
          stream: request.body.file,
          clusterClient,
          listsItemsIndex,
        });
        return response.accepted({ body: { lines_processed: linesProcessed } });
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
