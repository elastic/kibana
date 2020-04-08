/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { set } from 'lodash/fp';
import { TIMELINE_EXPORT_URL } from '../../../../common/constants';
import { transformError, buildSiemResponse } from '../../detection_engine/routes/utils';
import { createTemplateTimelines, getTemplateTimeline } from './utils/create_template_timelines';
import { FrameworkRequest } from '../../framework';
import { IRouter } from '../../../../../../../../src/core/server';
import { LegacyServices } from '../../../types';

export const createTemplateTimelinesRoute = (router: IRouter, config: LegacyServices['config']) => {
  router.post(
    {
      path: TIMELINE_EXPORT_URL,
      validate: false,
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const savedObjectsClient = context.core.savedObjects.client;
        const frameworkRequest = set(
          'context.core.savedObjects.client',
          savedObjectsClient,
          request
        );

        const templateTeimeline = getTemplateTimeline(
          frameworkRequest as FrameworkRequest,
          request.body.timeline.templateId
        );

        if (templateTeimeline === null) {
          await createTemplateTimelines(
            frameworkRequest as FrameworkRequest,
            request.body.timeline
          );
          return response.ok({ body: request.body.timeline });
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
