/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaResponseFactory, RequestHandler } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { isResponseError } from '@kbn/es-errors';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import {
  AI_INDEX_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_AI_INDEX_TRACES_INDEX_LENGTH,
  aiIndexSelfImprovementPath,
  traceIndicesPath,
} from '../../common/constants';
import type { ListTraceIndicesResponse } from '../../common/http_api/patterns';
import { apiPrivileges } from '../../common/features';
import { validateAiIndexId } from '../../common/validation';
import { AiIndexConflictError, AiIndexManagedError, AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import type { CasesService } from '../cases/service';
import type { ImprovementsService } from '../improvements/service';
import type { PatternsService } from '../patterns/service';
import { scheduleSelfImprovement, unscheduleSelfImprovement } from '../tasks';

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const aiIndexIdParamsSchema = schema.object({
  aiIndexId: schema.string({
    minLength: 1,
    maxLength: MAX_AI_INDEX_ID_LENGTH,
    validate: validateAiIndexId,
  }),
});

const withContextEngineFeatureFlag =
  <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> =>
  async (ctx, request, response) => {
    const { uiSettings } = await ctx.core;
    const isEnabled = await uiSettings.client.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);
    if (!isEnabled) {
      return response.notFound();
    }
    return handler(ctx, request, response);
  };

const handleError = (error: unknown, response: KibanaResponseFactory) => {
  if (error instanceof AiIndexNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof AiIndexManagedError || error instanceof AiIndexConflictError) {
    return response.conflict({ body: { message: error.message } });
  }
  throw error;
};

export const registerSelfImprovementRoutes = ({
  router,
  getAiIndexService,
  getCasesService,
  getPatternsService,
  getImprovementsService,
  getTaskManager,
}: {
  router: IRouter;
  getAiIndexService: () => AiIndexService;
  getCasesService: () => CasesService;
  getPatternsService: () => PatternsService;
  getImprovementsService: () => ImprovementsService;
  getTaskManager: () => TaskManagerStartContract | undefined;
}) => {
  // Enable self-improvement: persist the trace index and schedule the tasks.
  router.versioned
    .post({
      path: aiIndexSelfImprovementPath,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Enable self-improvement for an AI index',
      description:
        'Records the trace index to learn from and schedules the case_builder and trace_classifier tasks.',
      options: { tags: ['oas-tag:context engine'], availability: { stability: 'experimental' } },
    })
    .addVersion(
      {
        version: AI_INDEX_API_VERSION,
        validate: {
          request: {
            params: aiIndexIdParamsSchema,
            body: schema.object({
              traces_index: schema.string({ minLength: 1, maxLength: MAX_AI_INDEX_TRACES_INDEX_LENGTH }),
            }),
          },
        },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        try {
          const { aiIndexId } = request.params;
          const tracesIndex = request.body.traces_index;
          await getAiIndexService().patch(aiIndexId, {
            self_improvement: { enabled: true, traces_index: tracesIndex },
          });
          await Promise.all([
            getCasesService().ensureIndex(),
            getPatternsService().ensureIndex(),
            getImprovementsService().ensureIndex(),
          ]);
          const taskManager = getTaskManager();
          if (taskManager) {
            await scheduleSelfImprovement(taskManager, { aiIndexId, tracesIndex });
          }
          return response.ok({ body: { enabled: true } });
        } catch (error) {
          return handleError(error, response);
        }
      })
    );

  // Disable self-improvement: stop the tasks and flag it disabled.
  router.versioned
    .delete({
      path: aiIndexSelfImprovementPath,
      security: WRITE_SECURITY,
      access: 'public',
      summary: 'Reset self-improvement for an AI index',
      description:
        'Unschedules the case_builder and trace_classifier tasks, clears the trace index, and permanently removes the derived cases, patterns, and improvements — so the AI index can be re-pointed at a different trace index from a clean slate.',
      options: { tags: ['oas-tag:context engine'], availability: { stability: 'experimental' } },
    })
    .addVersion(
      { version: AI_INDEX_API_VERSION, validate: { request: { params: aiIndexIdParamsSchema } } },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        try {
          const { aiIndexId } = request.params;
          // Confirm it exists (throws AiIndexNotFoundError → 404) before purging.
          await getAiIndexService().get(aiIndexId);
          await getAiIndexService().patch(aiIndexId, {
            self_improvement: { enabled: false, traces_index: '' },
          });
          const taskManager = getTaskManager();
          if (taskManager) {
            await unscheduleSelfImprovement(taskManager, aiIndexId);
          }
          // Purge the derived data so a different trace index starts clean.
          await Promise.all([
            getCasesService().deleteByAiIndex(aiIndexId),
            getPatternsService().deleteByAiIndex(aiIndexId),
            getImprovementsService().deleteByAiIndex(aiIndexId),
          ]);
          return response.ok({ body: { enabled: false } });
        } catch (error) {
          return handleError(error, response);
        }
      })
    );

  // Candidate trace indices (data streams / indices matching `traces-*`) for the picker.
  router.versioned
    .get({
      path: traceIndicesPath,
      security: READ_SECURITY,
      access: 'public',
      summary: 'List candidate trace indices for self-improvement',
      options: { tags: ['oas-tag:context engine'], availability: { stability: 'experimental' } },
    })
    .addVersion(
      { version: AI_INDEX_API_VERSION, validate: false },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        try {
          const resolved = await esClient.indices.resolveIndex({
            name: 'traces-*',
            expand_wildcards: ['open'],
          });
          const names = [
            ...resolved.data_streams.map((dataStream) => dataStream.name),
            ...resolved.indices.map((index) => index.name),
          ];
          const body: ListTraceIndicesResponse = { indices: [...new Set(names)].sort() };
          return response.ok({ body });
        } catch (error) {
          if (isResponseError(error) && error.statusCode === 404) {
            return response.ok({ body: { indices: [] } as ListTraceIndicesResponse });
          }
          throw error;
        }
      })
    );
};
