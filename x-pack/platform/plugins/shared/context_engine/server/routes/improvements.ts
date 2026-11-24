/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, IRouter, Logger, RequestHandler } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  IMPROVEMENTS_INTERNAL_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_IMPROVEMENTS_PAGE_SIZE,
  MAX_IMPROVEMENTS_RESULT_WINDOW,
  aiIndexFeedbackAnalysisRunPath,
  aiIndexImprovementsPath,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type {
  ImprovementStatus,
  ListImprovementsResponse,
  RunFeedbackAnalysisResponse,
} from '../../common/http_api/improvements';
import {
  IMPROVEMENT_STATUSES,
  OPEN_IMPROVEMENT_STATUSES,
} from '../../common/http_api/improvements';
import { validateAiIndexId } from '../../common/validation';
import type { AiIndexService } from '../ai_indices/service';
import { FeedbackAnalysisAlreadyRunningError } from '../feedback_analysis/schedule';
import type { FeedbackAnalysisScheduleService } from '../feedback_analysis/schedule';
import type { ImprovementsServiceApi } from '../improvements/service';
import { reconcileImprovements } from '../improvements/reconcile';
import type { ProposalsProvider } from '../proposals/provider';
import { handleAiIndexError } from './ai_index_errors';
import { ImprovementAuditAction, improvementDecisionAuditEvent } from '../audit/audit_events';
import { resolveSpaceId } from './space';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

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

const listImprovementsQuerySchema = schema.object({
  /** Statuses to include; defaults to the open statuses. */
  status: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal('suggested'),
        schema.literal('applied'),
        schema.literal('rejected'),
        schema.literal('failed'),
      ]),
      { maxSize: IMPROVEMENT_STATUSES.length }
    )
  ),
  from: schema.number({
    min: 0,
    max: MAX_IMPROVEMENTS_RESULT_WINDOW - MAX_IMPROVEMENTS_PAGE_SIZE,
    defaultValue: 0,
  }),
  size: schema.number({
    min: 1,
    max: MAX_IMPROVEMENTS_PAGE_SIZE,
    defaultValue: DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  }),
});

export interface ImprovementRouteDeps {
  router: IRouter;
  getAiIndexService: () => AiIndexService;
  /** Returns an improvements service that uses the given request-scoped client. */
  getImprovementsService: (
    esClient: ElasticsearchClient,
    spaceId: string
  ) => ImprovementsServiceApi;
  /** Returns the registered proposals operations, or `undefined` if none are registered. */
  getProposalsProvider: () => ProposalsProvider | undefined;
  getScheduleService: () => FeedbackAnalysisScheduleService;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  /** Whether the global `contextEngine:feedbackLoopEnabled` setting is on. */
  getFeedbackLoopEnabled: () => Promise<boolean>;
  logger: Logger;
}

/** Registers the routes for reviewing improvements and starting a feedback analysis run. */
export const registerImprovementRoutes = ({
  router,
  getAiIndexService,
  getImprovementsService,
  getProposalsProvider,
  getScheduleService,
  getSpaces,
  getFeedbackLoopEnabled,
  logger,
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
    .get({
      path: aiIndexImprovementsPath,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'List improvements for an AI index',
      description:
        'Returns the improvements a feedback analysis run proposed for an AI index, newest first and paginated. Defaults to the ones still awaiting a decision.',
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: {
          request: { params: aiIndexParamsSchema, query: listImprovementsQuerySchema },
        },
      },
      gate(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const spaceId = 'default';
        const { status, from, size } = request.query;

        const improvements = getImprovementsService(esClient, spaceId);
        const listed = await improvements.list({
          aiIndexId: request.params.aiIndexId,
          status: (status ?? OPEN_IMPROVEMENT_STATUSES) as ImprovementStatus[],
          from,
          size,
        });

        const proposals = getProposalsProvider();
        if (!proposals) {
          return response.notFound();
        }
        const body: ListImprovementsResponse = {
          ...listed,
          items: await reconcileImprovements({
            improvements: listed.items,
            improvementsService: improvements,
            proposals,
            context: { spaceId, request },
            logger,
          }),
        };

        return response.ok({ body });
      })
    );

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
