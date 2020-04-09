/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set, omit } from 'lodash/fp';
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
import { Templatetimeline } from '../types';

import { getTimeline, timelineSavedObjectOmittedFields } from './utils/import_timelines';
import { templateTimelineSchema } from './schemas/import_timelines_schema';
export const createTemplateTimelinesRoute = (
  router: IRouter,
  config: LegacyServices['config'],
  security: SetupPlugins['security']
) => {
  router.post(
    {
      path: TEMPLATE_TIMELINE_URL,
      validate: {
        body: buildRouteValidation<Templatetimeline>(templateTimelineSchema),
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

        const templateTeimeline = await getTimeline(
          (frameworkRequest as unknown) as FrameworkRequest,
          request.body.savedObjectId
        );
        if (templateTeimeline == null) {
          const newTemplateTimeline = await createTemplateTimelines(
            (frameworkRequest as unknown) as FrameworkRequest,
            omit(timelineSavedObjectOmittedFields, request.body)
          );
          return response.ok({
            body: newTemplateTimeline,
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
