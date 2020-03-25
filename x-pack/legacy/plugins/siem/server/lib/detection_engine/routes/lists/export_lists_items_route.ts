/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Stream } from 'stream';
import { IRouter } from '../../../../../../../../../src/core/server';
import { DETECTION_ENGINE_LIST_ITEM_URL } from '../../../../../common/constants';
import { transformError, buildSiemResponse, buildRouteValidationIoTS } from '../utils';
import {
  exportListsItemsQuerySchema,
  ExportListsItemsQuerySchema,
} from '../schemas/request/export_lists_items_query_schema';
import { getList } from '../../lists/get_list';
import { writeListItemsToStream } from '../../lists/write_list_items_to_stream';

export const exportListsItemsRoute = (router: IRouter): void => {
  router.post(
    {
      path: `${DETECTION_ENGINE_LIST_ITEM_URL}/_export`,
      validate: {
        query: buildRouteValidationIoTS<ExportListsItemsQuerySchema>(exportListsItemsQuerySchema),
        // TODO: Do we want to add a body here like export_rules_route and allow a size limit?
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const savedObjectsClient = context.core.savedObjects.client;
        // TODO: Implement type and make it default to string
        // TODO: Make list_id optional and default to the file name with the upload
        // TODO: Make an overwrite flag and set its default to false and implement overwrite
        const { list_id: listId } = request.query;
        const list = await getList({ listId, savedObjectsClient });
        if (list == null) {
          return siemResponse.error({
            statusCode: 400,
            body: `list_id: ${listId} does not exist`,
          });
        } else {
          // TODO: Allow the API to override the fileName
          const fileName = list.attributes.name;

          const stream = new Stream.PassThrough();
          writeListItemsToStream({ listId, savedObjectsClient, stream });

          return response.ok({
            headers: {
              'Content-Disposition': `attachment; filename="${fileName}"`,
              'Content-Type': 'text/plain',
            },
            body: stream,
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
