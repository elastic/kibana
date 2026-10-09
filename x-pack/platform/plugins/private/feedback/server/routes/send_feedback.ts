/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, AnalyticsServiceSetup } from '@kbn/core/server';
import { FEEDBACK_SUBMITTED_EVENT_TYPE } from '../src';

const feedbackQuestionSchema = schema.object({
  id: schema.string({ minLength: 1, maxLength: 256 }),
  question: schema.string({ maxLength: 1024 }),
  answer: schema.string({ maxLength: 16384 }),
});

const feedbackBodySchema = schema.object({
  app_id: schema.string({ minLength: 1, maxLength: 256 }),
  user_email: schema.maybe(schema.string({ maxLength: 256 })),
  solution: schema.string({ maxLength: 256 }),
  csat_score: schema.maybe(schema.number()),
  questions: schema.maybe(schema.arrayOf(feedbackQuestionSchema, { maxSize: 2 })),
  organization_id: schema.maybe(schema.string({ maxLength: 256 })),
  allow_email_contact: schema.boolean(),
  url: schema.string({ maxLength: 2048 }),
});

export function registerSendFeedbackRoute(router: IRouter, analytics: AnalyticsServiceSetup) {
  router.post(
    {
      path: '/internal/feedback/send',
      validate: {
        body: feedbackBodySchema,
      },
      options: { access: 'internal' },
      security: {
        authz: {
          enabled: false,
          reason: 'This route allows users to send feedback data.',
        },
      },
    },
    async (context, request, response) => {
      const core = await context.core;

      const userId = await core.userProfile.getCurrentProfileId();
      try {
        analytics.reportEvent(FEEDBACK_SUBMITTED_EVENT_TYPE, {
          ...request.body,
          user_id: userId ?? undefined,
          source: 'kibana',
        });

        return response.ok({
          body: { success: true },
        });
      } catch (error) {
        return response.customError({
          body: error,
          statusCode: 500,
        });
      }
    }
  );
}
