/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set as _set } from 'lodash/fp';
import { IRouter } from '../../../../../../../../src/core/server';
import { LegacyServices } from '../../../types';
import { ExportTimelineRequestParams } from '../types';

import {
  transformError,
  buildRouteValidation,
  buildSiemResponse,
} from '../../detection_engine/routes/utils';
import { TIMELINE_EXPORT_URL } from '../../../../common/constants';

import {
  exportTimelinesSchema,
  exportTimelinesQuerySchema,
} from './schemas/export_timelines_schema';

import { getExportTimelineByObjectIds } from './utils/export_timelines';

export const exportTimelinesRoute = (router: IRouter, config: LegacyServices['config']) => {
  router.post(
    {
      path: TIMELINE_EXPORT_URL,
      validate: {
        query: buildRouteValidation<ExportTimelineRequestParams['query']>(
          exportTimelinesQuerySchema
        ),
        body: buildRouteValidation<ExportTimelineRequestParams['body']>(exportTimelinesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      try {
        const siemResponse = buildSiemResponse(response);
        const savedObjectsClient = context.core.savedObjects.client;
        const exportSizeLimit = config().get<number>('savedObjects.maxImportExportSize');
        if (request.body?.ids != null && request.body.ids.length > exportSizeLimit) {
          return siemResponse.error({
            statusCode: 400,
            body: `Can't export more than ${exportSizeLimit} timelines`,
          });
        }

        const responseBody = await getExportTimelineByObjectIds({
          client: savedObjectsClient,
          request,
        });

        return response.ok({
          headers: {
            'Content-Disposition': `attachment; filename="${request.query.file_name}"`,
            'Content-Type': 'application/ndjson',
          },
          body: responseBody,
        });
      } catch (err) {
        const error = transformError(err);
        const siemResponse = buildSiemResponse(response);

        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
