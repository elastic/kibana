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
import { writeListItemsToStream } from '../../lists/write_list_items_to_stream';
import { getList } from '../../lists/get_list';

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
        // TODO: Implement type and make it default to string
        // TODO: Make list_id optional and default to the file name with the upload
        // TODO: Make an overwrite flag and set its default to false and implement overwrite
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
            statusCode: 400,
            body: `list_id: ${listId} does not exist`,
          });
        } else {
          // TODO: Allow the API to override the fileName
          const fileName = list.name;

          const stream = new Stream.PassThrough();
          writeListItemsToStream({ listId, stream, clusterClient, listsItemsIndex });

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
