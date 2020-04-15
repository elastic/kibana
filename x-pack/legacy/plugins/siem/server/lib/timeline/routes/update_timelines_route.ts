/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set, omit, isNil } from 'lodash/fp';
import { TIMELINE_URL } from '../../../../common/constants';
import {
  transformError,
  buildSiemResponse,
  buildRouteValidation,
} from '../../detection_engine/routes/utils';
import { createTimelines, getTimeline } from './utils/create_timelines';
import { FrameworkRequest } from '../../framework';
import { IRouter } from '../../../../../../../../src/core/server';
import { LegacyServices } from '../../../types';
import { SetupPlugins } from '../../../plugin';
import { UpdateTimeline, TimelineTypeLiterals } from '../types';

import { timelineSavedObjectOmittedFields } from './utils/import_timelines';
import { updateTimelineSchema } from './schemas/update_timelines_schema';
import { createTemplateTimelines } from './utils/create_template_timelines';
export const updateTimelinesRoute = (
  router: IRouter,
  config: LegacyServices['config'],
  security: SetupPlugins['security']
) => {
  router.patch(
    {
      path: TIMELINE_URL,
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
        const { timelineId, templateTimelineId, timeline, type, version } = request.body;
        const isHandlingTemplateTimeline = type === TimelineTypeLiterals.template;
        let existTimeline = null;
        let existTemplateTimeline = null;
        let frameworkRequest = set('context.core.savedObjects.client', savedObjectsClient, request);
        frameworkRequest = set('user', user, frameworkRequest);

        if (!isNil(timelineId)) {
          existTimeline = await getTimeline(
            (frameworkRequest as unknown) as FrameworkRequest,
            timelineId
          );
        }

        // Manipulate timeline
        if (!isHandlingTemplateTimeline) {
          if (existTimeline == null || isNil(timelineId)) {
            // Try to Create timeline with PATCH
            return siemResponse.error({
              body: 'CREATE timeline with PATCH is not allowed, please use POST instead',
              statusCode: 405,
            });
          } else {
            // Update timeline
            await createTimelines(
              (frameworkRequest as unknown) as FrameworkRequest,
              omit(timelineSavedObjectOmittedFields, timeline),
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
        }

        // Manipulate template timeline
        if (isHandlingTemplateTimeline) {
          if (
            !isNil(templateTimelineId) &&
            existTimeline?.templateTimelineId === templateTimelineId
          ) {
            existTemplateTimeline = existTimeline;
          }

          if (existTemplateTimeline == null || isNil(timelineId) || isNil(templateTimelineId)) {
            // Try to Create template timeline with PATCH
            return siemResponse.error({
              body: 'CREATE template timeline with PATCH is not allowed, please use POST instead',
              statusCode: 405,
            });
          } else {
            // Update Template timeline
            const newTemplateTimeline = await createTemplateTimelines(
              (frameworkRequest as unknown) as FrameworkRequest,
              omit(timelineSavedObjectOmittedFields, timeline),
              timelineId,
              version,
              templateTimelineId
            );
            return response.ok({
              body: {
                data: {
                  persistTimeline: {
                    message: 'success',
                    timeline: newTemplateTimeline,
                  },
                },
              },
            });
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
