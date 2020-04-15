/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set, omit, isNil } from 'lodash/fp';
import { TEMPLATE_TIMELINE_URL } from '../../../../common/constants';
import {
  transformError,
  buildSiemResponse,
  buildRouteValidation,
} from '../../detection_engine/routes/utils';
import { createTemplateTimelines } from './utils/create_template_timelines';
import { FrameworkRequest } from '../../framework';
import { IRouter } from '../../../../../../../../src/core/server';
import { LegacyServices } from '../../../types';
import { SetupPlugins } from '../../../plugin';
import { Createimeline } from '../types';
import { createTimelines } from './utils/create_timelines';

import { getTimeline, timelineSavedObjectOmittedFields } from './utils/import_timelines';
import { updateTimelineSchema } from './schemas/update_timelines_schema';
export const updateTimelinesRoute = (
  router: IRouter,
  config: LegacyServices['config'],
  security: SetupPlugins['security']
) => {
  router.patch(
    {
      path: TEMPLATE_TIMELINE_URL,
      validate: {
        body: buildRouteValidation<UpdateTimeline>(updateTimelineSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const savedObjectsClient = context.core.savedObjects.client;
        const user = await security?.authc.getCurrentUser(request);
        const { timelineId, timeline, version } = request.body;
        let existTimeline = null;
        let frameworkRequest = set('context.core.savedObjects.client', savedObjectsClient, request);
        frameworkRequest = set('user', user, frameworkRequest);

        if (!isNil(timelineId)) {
          existTimeline = await getTimeline(
            (frameworkRequest as unknown) as FrameworkRequest,
            timelineId
          );
        }

        if (existTimeline == null || isNil(timelineId)) {
          return siemResponse.error({
            body: 'CREATE timeline with PATCH is not allowed, please use POST instead',
            statusCode: 405,
          });
        } else {
          await createTimelines(
            (frameworkRequest as unknown) as FrameworkRequest,
            omit(timelineSavedObjectOmittedFields, request.body),
            timelineId,
            version
          );
          return response.ok({
            body: {
              data: {
                persistTimeline: {
                  message: 'success',
                  timeline,
                },
              },
            },
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
