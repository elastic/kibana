/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set, omit, isNil } from 'lodash/fp';
import { TIMELINE_URL } from '../../../../common/constants';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { FrameworkRequest } from '../../framework';
import { IRouter } from '../../../../../../../../src/core/server';
import { LegacyServices } from '../../../types';
import { SetupPlugins } from '../../../plugin';
import { createTimelines, getTimeline } from './utils/create_timelines';

import { timelineSavedObjectOmittedFields } from './utils/import_timelines';
import { createTimelineSchema } from './schemas/create_timelines_schema';
import { createTemplateTimelines } from './utils/create_template_timelines';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { TimelineType } from '../../../graphql/types';

export const CREATE_TIMELINE_ERROR_MESSAGE =
  'UPDATE timeline with POST is not allowed, please use PATCH instead';
export const CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE =
  'UPDATE template timeline with POST is not allowed, please use PATCH instead';

export const createTimelinesRoute = (
  router: IRouter,
  config: LegacyServices['config'],
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: TIMELINE_URL,
      validate: {
        body: buildRouteValidation(createTimelineSchema),
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
        const { timelineId, templateTimelineId, timeline, timelineType, version } = request.body;
        const isHandlingTemplateTimeline = timelineType === TimelineType.template;
        let existTimeline = null;
        let existTemplateTimeline = null;
        let frameworkRequest = set('context.core.savedObjects.client', savedObjectsClient, request);
        frameworkRequest = set('user', user, frameworkRequest);
        // console.log('-------Manipulate timeline: timelineId--------', request.body);
        if (!isNil(timelineId)) {
          existTimeline = await getTimeline(
            (frameworkRequest as unknown) as FrameworkRequest,
            timelineId
          );
        }

        // Manipulate timeline

        if (!isHandlingTemplateTimeline) {
          if (existTimeline == null || isNil(timelineId)) {
            // Create timeline
            const newTimeline = await createTimelines(
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
                    timeline: newTimeline,
                  },
                },
              },
            });
          } else {
            // Try to Update timeline with POST
            return siemResponse.error({
              body: CREATE_TIMELINE_ERROR_MESSAGE,
              statusCode: 405,
            });
          }
        } else {
          // Manipulate template timeline
          if (
            !isNil(templateTimelineId) &&
            existTimeline?.templateTimelineId === templateTimelineId
          ) {
            existTemplateTimeline = existTimeline;
          }

          if (existTemplateTimeline == null || isNil(timelineId) || isNil(templateTimelineId)) {
            console.log(
              '0000',
              existTimeline,
              existTemplateTimeline,
              timelineId,
              isHandlingTemplateTimeline
            );

            // Create Template timeline
            const newTemplateTimeline = await createTemplateTimelines(
              (frameworkRequest as unknown) as FrameworkRequest,
              omit(timelineSavedObjectOmittedFields, timeline),
              null,
              version
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
          } else {
            // Try to Update Template timeline with POST
            return siemResponse.error({
              body: CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
              statusCode: 405,
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
