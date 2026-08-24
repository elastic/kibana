/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { KibanaResponseFactory, RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  IMPROVEMENTS_INTERNAL_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  aiIndexFeedbackContextPath,
  aiIndexFeedbackRunPath,
  aiIndexFeedbackSchedulePath,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type {
  GetFeedbackContextResponse,
  GetFeedbackScheduleResponse,
  PutFeedbackScheduleResponse,
  RunFeedbackLoopResponse,
} from '../../common/http_api/feedback_loop';
import { validateAiIndexId } from '../../common/validation';
import type { AiIndexService } from '../ai_indices/service';
import { assembleFeedbackContext } from '../feedback/context';
import type { ImprovementsServiceApi } from '../improvements/service';
import type { FeedbackScheduleService } from '../feedback/schedule';
import { FeedbackScheduleUnavailableError } from '../feedback/schedule';
import { handleAiIndexError } from './ai_index_errors';
import { resolveSpaceId } from './space';
import { withFeedbackLoopFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

/**
 * Workflows is an optional dependency of the feedback loop's plumbing, so its absence is a
 * temporary infrastructure gap rather than a bad request.
 */
const handleScheduleError = (error: unknown, response: KibanaResponseFactory) => {
  if (error instanceof FeedbackScheduleUnavailableError) {
    return response.customError({ statusCode: 503, body: { message: error.message } });
  }
  throw error;
};

const aiIndexIdParamsSchema = schema.object({
  aiIndexId: schema.string({
    minLength: 1,
    maxLength: MAX_AI_INDEX_ID_LENGTH,
    validate: validateAiIndexId,
    meta: { description: 'The unique identifier of the AI index.' },
  }),
});

/**
 * Registers the feedback-loop routes.
 *
 * The context route is what makes an automatic run and a manual one comparable: the scheduled
 * workflow fetches it with a `kibana.request` step and the browser fetches it before opening chat,
 * so both hand the agent the same briefing. Everything it returns is read on the caller's client.
 */
export const registerFeedbackLoopRoutes = ({
  router,
  getAiIndexService,
  getImprovementsService,
  getFeedbackScheduleService,
  getSpaces,
  getFeedbackLoopEnabled,
}: {
  router: IRouter;
  getAiIndexService: () => AiIndexService;
  getImprovementsService: () => ImprovementsServiceApi;
  getFeedbackScheduleService: () => FeedbackScheduleService;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  getFeedbackLoopEnabled: () => Promise<boolean>;
}) => {
  router.versioned
    .get({
      path: aiIndexFeedbackContextPath,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get the feedback-loop context for an AI index',
      description:
        'Returns everything the feedback agent is given about an AI index — its configuration, Knowledge Indicator summary, signal groups, and every improvement suggested so far — plus the rendered task briefing.',
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: { request: { params: aiIndexIdParamsSchema } },
      },
      withFeedbackLoopFeatureFlag(getFeedbackLoopEnabled, async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const spaceId = resolveSpaceId(await getSpaces(), request);

        try {
          const body: GetFeedbackContextResponse = await assembleFeedbackContext({
            esClient,
            aiIndexService: getAiIndexService(),
            improvementsService: getImprovementsService(),
            aiIndexId: request.params.aiIndexId,
            spaceId,
          });
          return response.ok({ body });
        } catch (error) {
          return handleAiIndexError(error, response);
        }
      })
    );

  // Run now: the same analysis the schedule performs, on demand and without opening chat.
  router.versioned
    .post({
      path: aiIndexFeedbackRunPath,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Run the feedback loop for an AI index now',
      description:
        'Starts one improvement-loop run for an AI index and returns its workflow execution id. Works whether or not the scheduled analysis is enabled.',
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: { request: { params: aiIndexIdParamsSchema } },
      },
      withFeedbackLoopFeatureFlag(getFeedbackLoopEnabled, async (ctx, request, response) => {
        const spaceId = resolveSpaceId(await getSpaces(), request);
        const { aiIndexId } = request.params;

        try {
          await getAiIndexService().get(aiIndexId);
        } catch (error) {
          return handleAiIndexError(error, response);
        }

        try {
          const executionId = await getFeedbackScheduleService().run({
            spaceId,
            aiIndexId,
            request,
          });
          const body: RunFeedbackLoopResponse = { execution_id: executionId };
          return response.ok({ body });
        } catch (error) {
          return handleScheduleError(error, response);
        }
      })
    );

  router.versioned
    .get({
      path: aiIndexFeedbackSchedulePath,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get the feedback-loop schedule for an AI index',
      description:
        'Reports whether the scheduled analysis is enabled for an AI index, and the workflow backing it.',
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: { request: { params: aiIndexIdParamsSchema } },
      },
      withFeedbackLoopFeatureFlag(getFeedbackLoopEnabled, async (ctx, request, response) => {
        const spaceId = resolveSpaceId(await getSpaces(), request);

        try {
          const body: GetFeedbackScheduleResponse = await getFeedbackScheduleService().getStatus({
            spaceId,
            aiIndexId: request.params.aiIndexId,
          });
          return response.ok({ body });
        } catch (error) {
          return handleScheduleError(error, response);
        }
      })
    );

  router.versioned
    .put({
      path: aiIndexFeedbackSchedulePath,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Enable or disable the feedback-loop schedule for an AI index',
      description:
        'Turns the scheduled analysis on or off for an AI index. Enabling installs the improvement-loop workflow and binds the caller’s credentials, so scheduled runs execute with the caller’s privileges.',
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: {
          request: {
            params: aiIndexIdParamsSchema,
            body: schema.object({ enabled: schema.boolean() }),
          },
        },
      },
      withFeedbackLoopFeatureFlag(getFeedbackLoopEnabled, async (ctx, request, response) => {
        const spaceId = resolveSpaceId(await getSpaces(), request);
        const { aiIndexId } = request.params;
        const { enabled } = request.body;

        try {
          await getAiIndexService().get(aiIndexId);
        } catch (error) {
          return handleAiIndexError(error, response);
        }

        try {
          const body: PutFeedbackScheduleResponse = await getFeedbackScheduleService().setEnabled({
            spaceId,
            aiIndexId,
            enabled,
            request,
          });
          return response.ok({ body });
        } catch (error) {
          return handleScheduleError(error, response);
        }
      })
    );
};
