/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TIMELINE_URL } from '../../../../common/constants';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { FrameworkRequest } from '../../framework';
import { IRouter } from '../../../../../../../../src/core/server';
import { LegacyServices } from '../../../types';
import { SetupPlugins } from '../../../plugin';
import {
  createTimelines,
  getTimeline,
  getTemplateTimeline,
  CREATE_TEMPLATE_TIMELINE_ERROR_MESSAGE,
  CREATE_TIMELINE_ERROR_MESSAGE,
} from './utils/create_timelines';

import { createTimelineSchema } from './schemas/create_timelines_schema';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { TimelineType } from '../../../graphql/types';
import { buildFrameworkRequest } from './utils/common';

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
        const frameworkRequest = await buildFrameworkRequest(context, security, request);

        const { timelineId, timeline, timelineType, version } = request.body;
        const { templateTimelineId } = timeline;
        const isHandlingTemplateTimeline = timelineType === TimelineType.template;

        const existTimeline =
          timelineId != null ? await getTimeline(frameworkRequest, timelineId) : null;
        const existTemplateTimeline =
          templateTimelineId != null
            ? await getTemplateTimeline(frameworkRequest, templateTimelineId)
            : null;

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
