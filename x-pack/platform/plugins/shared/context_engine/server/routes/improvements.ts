/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { schema } from '@kbn/config-schema';
import type {
  ElasticsearchClient,
  IRouter,
  KibanaResponseFactory,
  Logger,
  RequestHandler,
} from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  IMPROVEMENTS_INTERNAL_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_IMPROVEMENT_ID_LENGTH,
  MAX_IMPROVEMENTS_PAGE_SIZE,
  MAX_IMPROVEMENTS_RESULT_WINDOW,
  aiIndexFeedbackAnalysisRunPath,
  aiIndexImprovementsPath,
  improvementApprovePath,
  improvementRejectPath,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type {
  ImprovementResolution,
  ImprovementStatus,
  ListImprovementsResponse,
  MutateImprovementResponse,
  RunFeedbackAnalysisResponse,
} from '../../common/http_api/improvements';
import {
  IMPROVEMENT_STATUSES,
  OPEN_IMPROVEMENT_STATUSES,
  isOpenImprovement,
} from '../../common/http_api/improvements';
import { validateAiIndexId } from '../../common/validation';
import type { AiIndexService } from '../ai_indices/service';
import type { FeedbackAnalysisScheduleService } from '../feedback_analysis/schedule';
import { ApplyImprovementError, applyImprovement } from '../improvements/apply';
import { ImprovementConflictError, ImprovementNotFoundError } from '../improvements/errors';
import type { ImprovementsServiceApi } from '../improvements/service';
import type { WorkflowProvider } from '../workflows/provider';
import { handleAiIndexError } from './ai_index_errors';
import { ImprovementAuditAction, improvementDecisionAuditEvent } from './audit_events';
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

const improvementParamsSchema = schema.object({
  aiIndexId: aiIndexIdSchema,
  improvementId: schema.string({ minLength: 1, maxLength: MAX_IMPROVEMENT_ID_LENGTH }),
});

const listImprovementsQuerySchema = schema.object({
  /**
   * Statuses to include. Omitted means the open ones, so the review panel never leads with a
   * decision the user already made.
   */
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

const rejectBodySchema = schema.object({
  /** The reviewer's words, read back to later runs so the same fix is not proposed again. */
  reason: schema.maybe(schema.string({ maxLength: 2048 })),
});

/**
 * A decision that raced another one returns 409 rather than an error: the panel refreshes and shows
 * whichever decision won, which is a state the user can act on.
 */
const handleImprovementError = (error: unknown, response: KibanaResponseFactory) => {
  if (error instanceof ImprovementConflictError) {
    return response.conflict({ body: { message: error.message } });
  }
  if (error instanceof ImprovementNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  throw error;
};

export interface ImprovementRouteDeps {
  router: IRouter;
  getAiIndexService: () => AiIndexService;
  /** Request-scoped: the improvements store is a user-owned index, authorized per call by ES. */
  getImprovementsService: (esClient: ElasticsearchClient) => ImprovementsServiceApi;
  /** Absent until `contextEngineAgentBuilder` registers it, which rules out the workflow actions. */
  getWorkflowProvider: () => WorkflowProvider | undefined;
  getScheduleService: () => FeedbackAnalysisScheduleService;
  getActions: () => Promise<ActionsPluginStart>;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  /** Reads the global `contextEngine:feedbackLoopEnabled` setting; routes 404 while it is off. */
  getFeedbackLoopEnabled: () => Promise<boolean>;
  logger: Logger;
}

/**
 * Registers the improvement review routes: read the suggestions a run produced, decide on one, and
 * start a run by hand.
 *
 * **Approving is the authorization boundary.** Both the store access and the change it materializes
 * run on the approving user's own Elasticsearch client and request, so an approval can never effect
 * something the user could not do themselves — the runner's credentials are not borrowed here.
 */
export const registerImprovementRoutes = ({
  router,
  getAiIndexService,
  getImprovementsService,
  getWorkflowProvider,
  getScheduleService,
  getActions,
  getSpaces,
  getFeedbackLoopEnabled,
  logger,
}: ImprovementRouteDeps) => {
  /** Every route here is behind both the Context Engine and the feedback loop settings. */
  const gate = <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> =>
    withContextEngineFeatureFlag<P, Q, B>(async (ctx, request, response) => {
      if (!(await getFeedbackLoopEnabled())) {
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
        const { status, from, size } = request.query;

        const body: ListImprovementsResponse = await getImprovementsService(esClient).list({
          aiIndexId: request.params.aiIndexId,
          status: (status ?? OPEN_IMPROVEMENT_STATUSES) as ImprovementStatus[],
          from,
          size,
        });

        return response.ok({ body });
      })
    );

  router.versioned
    .post({
      path: improvementApprovePath,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Approve an improvement',
      description:
        "Applies the proposed change under the caller's own privileges and records the improvement as applied. A failed apply is recorded on the improvement, which stays open so it can be retried.",
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: { request: { params: improvementParamsSchema } },
      },
      gate(async (ctx, request, response) => {
        const core = await ctx.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const auditLogger = core.security.audit.logger;
        const { aiIndexId, improvementId } = request.params;
        const audit = (error?: Error) =>
          auditLogger.log(
            improvementDecisionAuditEvent({
              action: ImprovementAuditAction.APPROVE,
              aiIndexId,
              improvementId,
              error,
            })
          );

        const improvements = getImprovementsService(esClient);
        const improvement = await improvements.get(improvementId);

        if (!improvement || improvement.ai_index_id !== aiIndexId) {
          return response.notFound({
            body: { message: `Improvement [${improvementId}] was not found.` },
          });
        }
        if (!isOpenImprovement(improvement.status)) {
          return response.conflict({
            body: {
              message: `Improvement [${improvementId}] was already ${improvement.status} and cannot be approved.`,
            },
          });
        }

        const by = core.security.authc.getCurrentUser()?.username;
        const resolution: ImprovementResolution = by ? { by } : {};

        let appliedTargetId: string;
        try {
          appliedTargetId = await applyImprovement(improvement, {
            esClient,
            aiIndexService: getAiIndexService(),
            workflows: getWorkflowProvider(),
            actions: await getActions(),
            spaceId: resolveSpaceId(await getSpaces(), request),
            request,
            logger,
          });
        } catch (error) {
          if (!(error instanceof ApplyImprovementError)) {
            audit(error instanceof Error ? error : new Error(String(error)));
            return handleImprovementError(error, response);
          }

          // Recorded on the improvement rather than only returned, so the next run can see what
          // went wrong, and so a reviewer who fixes the cause can approve the same proposal again.
          await improvements
            .transition(improvementId, 'failed', { ...resolution, error: error.message })
            .catch((transitionError) => {
              logger.warn(
                `Failed to record the apply failure on improvement [${improvementId}]: ${transitionError.message}`
              );
            });
          audit(error);

          return response.badRequest({ body: { message: error.message } });
        }

        try {
          const improved = await improvements.transition(improvementId, 'applied', {
            ...resolution,
            applied_target_id: appliedTargetId,
          });
          audit();

          const body: MutateImprovementResponse = { improvement: improved };
          return response.ok({ body });
        } catch (error) {
          // The change is already written. Reporting the bookkeeping failure is honest, and leaves
          // the improvement open rather than claiming a decision the store never recorded.
          audit(error instanceof Error ? error : new Error(String(error)));
          return handleImprovementError(error, response);
        }
      })
    );

  router.versioned
    .post({
      path: improvementRejectPath,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Reject an improvement',
      description:
        'Records the improvement as rejected. It leaves the review list but is still handed to later runs, along with the reason, so the same fix is not proposed again.',
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: { request: { params: improvementParamsSchema, body: rejectBodySchema } },
      },
      gate(async (ctx, request, response) => {
        const core = await ctx.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const auditLogger = core.security.audit.logger;
        const { aiIndexId, improvementId } = request.params;

        const improvements = getImprovementsService(esClient);
        const improvement = await improvements.get(improvementId);

        if (!improvement || improvement.ai_index_id !== aiIndexId) {
          return response.notFound({
            body: { message: `Improvement [${improvementId}] was not found.` },
          });
        }
        if (improvement.status === 'applied') {
          return response.conflict({
            body: {
              message: `Improvement [${improvementId}] was already applied and cannot be rejected.`,
            },
          });
        }

        const by = core.security.authc.getCurrentUser()?.username;
        const { reason } = request.body;

        try {
          const improved = await improvements.transition(improvementId, 'rejected', {
            ...(by ? { by } : {}),
            ...(reason ? { reason } : {}),
          });
          auditLogger.log(
            improvementDecisionAuditEvent({
              action: ImprovementAuditAction.REJECT,
              aiIndexId,
              improvementId,
            })
          );

          const body: MutateImprovementResponse = { improvement: improved };
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            improvementDecisionAuditEvent({
              action: ImprovementAuditAction.REJECT,
              aiIndexId,
              improvementId,
              error: error instanceof Error ? error : new Error(String(error)),
            })
          );
          return handleImprovementError(error, response);
        }
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

        let aiIndex;
        try {
          aiIndex = await getAiIndexService().get(aiIndexId);
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
          const executionId = await getScheduleService().run({
            aiIndexId,
            spaceId: resolveSpaceId(await getSpaces(), request),
            request,
          });
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
          throw error;
        }
      })
    );
};
