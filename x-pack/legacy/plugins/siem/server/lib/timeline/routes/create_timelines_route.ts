/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set, omit } from 'lodash/fp';
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
        let frameworkRequest = set('context.core.savedObjects.client', savedObjectsClient, request);
        frameworkRequest = set('user', user, frameworkRequest);

        const { timelineId, templateTimelineId, timeline, timelineType, version } = request.body;
        const isHandlingTemplateTimeline = timelineType === TimelineType.template;

        const existTimeline =
          timelineId != null
            ? await getTimeline((frameworkRequest as unknown) as FrameworkRequest, timelineId)
            : null;
        const existTemplateTimeline =
          templateTimelineId != null ? await getTemplateTimeline() : null;

        if (
          (!isHandlingTemplateTimeline && existTimeline != null) ||
          (isHandlingTemplateTimeline && (existTemplateTimeline != null || existTimeline != null))
        ) {
          return siemResponse.error({
            body: isHandlingTemplateTimeline
              ? CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE
              : CREATE_TIMELINE_ERROR_MESSAGE,
            statusCode: 405,
          });
        }

        // Create timeline
        const newTimeline = await createTimelines(
          (frameworkRequest as unknown) as FrameworkRequest,
          timeline,
          null,
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
