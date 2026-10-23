/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  AI_INDEX_SUGGEST_AUTOMATION_CONTEXT_PATH,
  MAX_AI_INDEX_ID_LENGTH,
  SUGGEST_AUTOMATION_CONTEXT_INTERNAL_API_VERSION,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { SuggestAutomationContextResponse } from '../../common/http_api/automation_suggestion_context';
import { validateAiIndexId } from '../../common/validation';
import { AiIndexNotFoundError, AiIndexNotReadableError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { buildAutomationSuggestionContext } from '../automation_suggestions/build_context';
import type { WorkflowEnablementApi } from '../feedback_analysis/schedule';
import { resolveSpaceId } from '../utils/resolve_space_id';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const paramsSchema = schema.object({
  aiIndexId: schema.string({
    minLength: 1,
    maxLength: MAX_AI_INDEX_ID_LENGTH,
    validate: validateAiIndexId,
  }),
});

/**
 * Registers the route that pre-explores an AI index for "Suggest automation": field summaries and
 * sample documents for each source, the definition of each existing automation, and how many
 * signals and trace rows the index already has. Read-only; nothing here changes the index.
 */
export const registerAutomationSuggestionRoutes = ({
  router,
  getAiIndexService,
  getSpaces,
  getWorkflows,
}: {
  router: IRouter;
  getAiIndexService: () => AiIndexService;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  getWorkflows: () => Promise<WorkflowEnablementApi | undefined>;
}) => {
  router.versioned
    .get({
      path: AI_INDEX_SUGGEST_AUTOMATION_CONTEXT_PATH,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Pre-explore an AI index for suggesting an automation',
      description:
        'Inspects the AI index the way a reviewer setting it up would — field summaries and a sample ' +
        "of documents per source, each existing automation's definition, and how many signals and " +
        'trace rows already exist — so the agent reviewing it can decide rather than rediscover.',
    })
    .addVersion(
      {
        version: SUGGEST_AUTOMATION_CONTEXT_INTERNAL_API_VERSION,
        validate: { request: { params: paramsSchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const spaceId = resolveSpaceId(await getSpaces(), request);
        const { aiIndexId } = request.params;

        let aiIndex;
        try {
          aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
        } catch (error) {
          if (error instanceof AiIndexNotFoundError) {
            return response.notFound({ body: { message: error.message } });
          }
          if (error instanceof AiIndexNotReadableError) {
            return response.forbidden({ body: { message: error.message } });
          }
          throw error;
        }

        const body: SuggestAutomationContextResponse = await buildAutomationSuggestionContext(
          aiIndex,
          { esClient, spaceId, request, workflows: await getWorkflows() }
        );

        return response.ok({ body });
      })
    );
};
