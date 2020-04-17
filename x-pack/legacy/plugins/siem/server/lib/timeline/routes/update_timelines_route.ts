/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set, omit, isNil } from 'lodash/fp';
import { TIMELINE_URL } from '../../../../common/constants';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { createTimelines, getTimeline } from './utils/create_timelines';
import { FrameworkRequest } from '../../framework';
import { IRouter } from '../../../../../../../../src/core/server';
import { LegacyServices } from '../../../types';
import { SetupPlugins } from '../../../plugin';

import { timelineSavedObjectOmittedFields } from './utils/import_timelines';
import { updateTimelineSchema } from './schemas/update_timelines_schema';
import { createTemplateTimelines } from './utils/create_template_timelines';
import { buildRouteValidation } from '../../../utils/build_validation/route_validation';
import { TimelineType } from '../../../graphql/types';

export const updateTimelinesRoute = (
  router: IRouter,
  config: LegacyServices['config'],
  security: SetupPlugins['security']
) => {
  router.patch(
    {
      path: TIMELINE_URL,
      validate: {
        body: buildRouteValidation(updateTimelineSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    // eslint-disable-next-line complexity
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const savedObjectsClient = context.core.savedObjects.client;
        const user = await security?.authc.getCurrentUser(request);
        let frameworkRequest = set('context.core.savedObjects.client', savedObjectsClient, request);
        frameworkRequest = set('user', user, frameworkRequest);

        const {
          timelineId,
          templateTimelineId,
          templateTimelineVersion,
          timeline,
          timelineType,
          version,
        } = request.body;
        const isHandlingTemplateTimeline = timeline.timelineType === TimelineType.template;

        const existTimeline =
          timeline.savedObjectId != null
            ? await getTimeline((frameworkRequest as unknown) as FrameworkRequest, timelineId)
            : null;
        const existTemplateTimeline =
          templateTimelineId != null ? await getTemplateTimeline() : null;

        if (!isHandlingTemplateTimeline && existTimeline == null) {
          // Throw error to create timeline in patch
        } else if (isHandlingTemplateTimeline && existTemplateTimeline == null) {
          // Throw error to create template timeline in patch
        } else if (
          isHandlingTemplateTimeline &&
          existTimeline != null &&
          existTemplateTimeline != null &&
          existTimeline.savedObjectId !== existTemplateTimeline.savedObjectId
        ) {
          // Throw error you can not have a no matching between your timeline and your template timeline during an update
        } else if (!isHandlingTemplateTimeline && existTimeline?.version !== version) {
          // throw error 409 conflict timeline
        } else if (
          isHandlingTemplateTimeline &&
          existTemplateTimeline.templateTimelineVersion == null &&
          existTemplateTimeline.version !== version
        ) {
          // throw error 409 conflict timeline
        } else if (
          isHandlingTemplateTimeline &&
          existTemplateTimeline.templateTimelineVersion != null &&
          existTemplateTimeline.templateTimelineVersion < templateTimelineVersion
        ) {
          // Throw error you can not update a template timeline version with an old version
        }

          await createTimelines(
            (frameworkRequest as unknown) as FrameworkRequest,
            timeline,
            timelineId,
            version,
            isHandlingTemplateTimeline: { templateTimelineId, templateTimelineVersion} : null
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
