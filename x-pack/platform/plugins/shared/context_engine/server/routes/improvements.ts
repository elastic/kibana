/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  IMPROVEMENTS_INTERNAL_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  aiIndexFeedbackAnalysisRunPath,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { RunFeedbackAnalysisResponse } from '../../common/http_api/improvements';
import { validateAiIndexId } from '../../common/validation';
import type { AiIndexService } from '../ai_indices/service';
import { FeedbackAnalysisAlreadyRunningError } from '../feedback_analysis/schedule';
import type { FeedbackAnalysisScheduleService } from '../feedback_analysis/schedule';
import type { ProposalsProvider } from '../proposals/provider';
import { handleAiIndexError } from './ai_index_errors';
import { ImprovementAuditAction, improvementDecisionAuditEvent } from '../audit/audit_events';
import { resolveSpaceId } from './space';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

const aiIndexIdSchema = schema.string({
  minLength: 1,
  maxLength: MAX_AI_INDEX_ID_LENGTH,
  validate: validateAiIndexId,
  meta: { description: 'The unique identifier of the AI index.' },
});

const aiIndexParamsSchema = schema.object({ aiIndexId: aiIndexIdSchema });

export interface ImprovementRouteDeps {
  router: IRouter;
  getAiIndexService: () => AiIndexService;
  /** Returns the registered proposals operations, or `undefined` if none are registered. */
  getProposalsProvider: () => ProposalsProvider | undefined;
  getScheduleService: () => FeedbackAnalysisScheduleService;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  /** Whether the global `contextEngine:feedbackLoopEnabled` setting is on. */
  getFeedbackLoopEnabled: () => Promise<boolean>;
}

/** Registers the route that starts a feedback analysis run. */
export const registerImprovementRoutes = ({
  router,
  getAiIndexService,
  getProposalsProvider,
  getScheduleService,
  getSpaces,
  getFeedbackLoopEnabled,
}: ImprovementRouteDeps) => {
  const gate = <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> =>
    withContextEngineFeatureFlag<P, Q, B>(async (ctx, request, response) => {
      // Improvements are reviewed as proposals, so there is nothing to review without them.
      if (!getProposalsProvider() || !(await getFeedbackLoopEnabled())) {
        return response.notFound();
      }
      return handler(ctx, request, response);
    });

  router.versioned
    .post({
      path: aiIndexFeedbackAnalysisRunPath,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Run feedback analysis now',
      description:
        'Starts one analysis run off-schedule. Requires feedback analysis to be enabled: turning it off uninstalls the workflow, so there is nothing to execute.',
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: { request: { params: aiIndexParamsSchema } },
      },
      gate(async (ctx, request, response) => {
        const core = await ctx.core;
        const auditLogger = core.security.audit.logger;
        const { aiIndexId } = request.params;
        const spaceId = resolveSpaceId(await getSpaces(), request);

        let aiIndex;
        try {
          aiIndex = await getAiIndexService().get(aiIndexId, spaceId);
        } catch (error) {
          return handleAiIndexError(error, response);
        }

        if (!aiIndex.feedback_analysis?.enabled) {
          return response.badRequest({
            body: {
              message: `Feedback analysis is not enabled for AI index [${aiIndexId}], so there is no analysis to run. Enable it first.`,
            },
          });
        }

        try {
          const executionId = await getScheduleService().run({ aiIndexId, spaceId, request });
          auditLogger.log(
            improvementDecisionAuditEvent({ action: ImprovementAuditAction.RUN, aiIndexId })
          );

          const body: RunFeedbackAnalysisResponse = { execution_id: executionId };
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            improvementDecisionAuditEvent({
              action: ImprovementAuditAction.RUN,
              aiIndexId,
              error: error instanceof Error ? error : new Error(String(error)),
            })
          );

          if (error instanceof FeedbackAnalysisAlreadyRunningError) {
            return response.conflict({ body: { message: error.message } });
          }

          throw error;
        }
      })
    );
};
