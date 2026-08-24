/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  IMPROVEMENTS_INTERNAL_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_IMPROVEMENT_ID_LENGTH,
  MAX_IMPROVEMENT_KI_CONTENT_LENGTH,
  MAX_IMPROVEMENT_RATIONALE_LENGTH,
  MAX_IMPROVEMENT_TAGS,
  MAX_IMPROVEMENT_TITLE_LENGTH,
  MAX_IMPROVEMENT_WORKFLOW_YAML_LENGTH,
  MAX_IMPROVEMENTS_PAGE_SIZE,
  MAX_IMPROVEMENTS_PER_RUN,
  aiIndexImprovementsPath,
  improvementApprovePath,
  improvementRejectPath,
  improvementsPath,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type {
  ImprovementEnvelope,
  ListImprovementsResponse,
  MutateImprovementResponse,
  RecordImprovementsResponse,
} from '../../common/http_api/improvements';
import { OPEN_IMPROVEMENT_STATUSES } from '../../common/http_api/improvements';
import { validateAiIndexId } from '../../common/validation';
import type { AiIndexService } from '../ai_indices/service';
import { applyImprovement, ApplyImprovementError } from '../improvements/apply';
import { toImprovementEnvelope } from '../improvements/propose';
import type { ImprovementsServiceApi } from '../improvements/service';
import type { WorkflowProvider } from '../workflows/provider';
import { handleAiIndexError } from './ai_index_errors';
import { ImprovementAuditAction, improvementAuditEvent } from './audit_events';
import { resolveSpaceId } from './space';
import { withFeedbackLoopFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

/** Upper bound on `from + size`, so deep pagination cannot exceed ES `index.max_result_window`. */
const MAX_RESULT_WINDOW = 10000;

const aiIndexIdSchema = schema.string({
  minLength: 1,
  maxLength: MAX_AI_INDEX_ID_LENGTH,
  validate: validateAiIndexId,
  meta: { description: 'The unique identifier of the AI index.' },
});

const improvementIdParamsSchema = schema.object({
  improvementId: schema.string({ minLength: 1, maxLength: MAX_IMPROVEMENT_ID_LENGTH }),
});

const listImprovementsQuerySchema = schema.object({
  /**
   * Statuses to include. Omitted means the open ones, so the review panel never shows a
   * suggestion the user already rejected.
   */
  status: schema.maybe(
    schema.arrayOf(
      schema.oneOf([
        schema.literal('proposed'),
        schema.literal('applied'),
        schema.literal('rejected'),
        schema.literal('failed'),
      ]),
      { maxSize: 4 }
    )
  ),
  from: schema.number({
    min: 0,
    max: MAX_RESULT_WINDOW - MAX_IMPROVEMENTS_PAGE_SIZE,
    defaultValue: 0,
  }),
  size: schema.number({
    min: 1,
    max: MAX_IMPROVEMENTS_PAGE_SIZE,
    defaultValue: DEFAULT_IMPROVEMENTS_PAGE_SIZE,
  }),
});

const kiPayloadSchema = schema.object({
  type: schema.maybe(schema.string({ maxLength: 256 })),
  title: schema.maybe(schema.string({ maxLength: MAX_IMPROVEMENT_TITLE_LENGTH })),
  description: schema.maybe(schema.string({ maxLength: MAX_IMPROVEMENT_KI_CONTENT_LENGTH })),
  content: schema.maybe(schema.string({ maxLength: MAX_IMPROVEMENT_KI_CONTENT_LENGTH })),
  tags: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: 256 }), { maxSize: MAX_IMPROVEMENT_TAGS })
  ),
});

const proposedImprovementSchema = schema.object({
  action: schema.oneOf([
    schema.literal('add_ki'),
    schema.literal('edit_ki'),
    schema.literal('remove_ki'),
    schema.literal('add_workflow'),
    schema.literal('edit_workflow'),
    schema.literal('remove_workflow'),
  ]),
  title: schema.string({ minLength: 1, maxLength: MAX_IMPROVEMENT_TITLE_LENGTH }),
  rationale: schema.string({ minLength: 1, maxLength: MAX_IMPROVEMENT_RATIONALE_LENGTH }),
  confidence: schema.maybe(schema.number({ min: 0, max: 1 })),
  signal_tags: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: 1024 }), { maxSize: MAX_IMPROVEMENT_TAGS })
  ),
  signal_ids: schema.maybe(
    schema.arrayOf(schema.string({ maxLength: 1024 }), { maxSize: MAX_IMPROVEMENT_TAGS })
  ),
  target_ki_id: schema.maybe(schema.string({ maxLength: MAX_IMPROVEMENT_ID_LENGTH })),
  target_workflow_id: schema.maybe(schema.string({ maxLength: MAX_IMPROVEMENT_ID_LENGTH })),
  ki: schema.maybe(kiPayloadSchema),
  workflow_yaml: schema.maybe(schema.string({ maxLength: MAX_IMPROVEMENT_WORKFLOW_YAML_LENGTH })),
});

const recordImprovementsBodySchema = schema.object({
  ai_index_id: aiIndexIdSchema,
  run_id: schema.maybe(schema.string({ maxLength: MAX_IMPROVEMENT_ID_LENGTH })),
  improvements: schema.arrayOf(proposedImprovementSchema, {
    maxSize: MAX_IMPROVEMENTS_PER_RUN,
  }),
});

/**
 * A suggestion the user has not settled yet. `failed` is included: an apply that errored left the
 * suggestion untouched, so retrying it after fixing the cause is the expected next step.
 */
const isActionable = (improvement: ImprovementEnvelope): boolean =>
  improvement.status === 'proposed' || improvement.status === 'failed';

/**
 * Registers the Improvements routes.
 *
 * Reading and writing the review state both go through the internal-user service, because the
 * improvements index is plugin-owned. The *effect* of an approval — the KI or workflow change —
 * always runs on the caller's own client, so approving cannot do anything the user could not do by
 * hand.
 */
export const registerImprovementRoutes = ({
  router,
  getAiIndexService,
  getImprovementsService,
  getWorkflowProvider,
  getSpaces,
  getFeedbackLoopEnabled,
  logger,
}: {
  router: IRouter;
  getAiIndexService: () => AiIndexService;
  getImprovementsService: () => ImprovementsServiceApi;
  getWorkflowProvider: () => WorkflowProvider | undefined;
  getSpaces: () => Promise<SpacesPluginStart | undefined>;
  getFeedbackLoopEnabled: () => Promise<boolean>;
  logger: Logger;
}) => {
  // List an AI index's improvements.
  router.versioned
    .get({
      path: aiIndexImprovementsPath,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'List improvements for an AI index',
      description:
        'Returns the improvement suggestions recorded for an AI index, newest first and paginated. Defaults to the suggestions still awaiting a decision.',
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: {
          request: {
            params: schema.object({ aiIndexId: aiIndexIdSchema }),
            query: listImprovementsQuerySchema,
          },
        },
      },
      withFeedbackLoopFeatureFlag(getFeedbackLoopEnabled, async (ctx, request, response) => {
        const spaceId = resolveSpaceId(await getSpaces(), request);
        const { status, from, size } = request.query;

        const body: ListImprovementsResponse = await getImprovementsService().list(spaceId, {
          aiIndexId: request.params.aiIndexId,
          statuses: status ?? OPEN_IMPROVEMENT_STATUSES,
          from,
          size,
        });

        return response.ok({ body });
      })
    );

  // Record a run's suggestions.
  router.versioned
    .post({
      path: improvementsPath,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Record proposed improvements',
      description:
        'Records the suggestions a feedback-loop run produced. Suggestions that repeat one already proposed or already resolved are skipped rather than duplicated.',
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: { request: { body: recordImprovementsBodySchema } },
      },
      withFeedbackLoopFeatureFlag(getFeedbackLoopEnabled, async (ctx, request, response) => {
        const spaceId = resolveSpaceId(await getSpaces(), request);
        const { ai_index_id: aiIndexId, run_id: runId, improvements } = request.body;

        // Rejects an unknown AI index before anything is written.
        try {
          await getAiIndexService().get(aiIndexId);
        } catch (error) {
          return handleAiIndexError(error, response);
        }

        const suggestedAt = new Date().toISOString();
        const candidates = improvements.map((proposal) =>
          toImprovementEnvelope({ aiIndexId, proposal, runId, suggestedAt })
        );

        const existing = await getImprovementsService().getByIds(
          spaceId,
          candidates.map(({ improvement_id: id }) => id)
        );
        // A still-open duplicate is refreshed with the newer rationale; a resolved one is left alone,
        // so an approval or rejection is never silently reopened.
        const resolvedIds = new Set(
          existing.filter((improvement) => !isActionable(improvement)).map((i) => i.improvement_id)
        );
        const recordable = candidates.filter(({ improvement_id: id }) => !resolvedIds.has(id));

        await getImprovementsService().write(spaceId, recordable);

        const body: RecordImprovementsResponse = {
          recorded: recordable.map(({ improvement_id: id }) => id),
          skipped: candidates.length - recordable.length,
        };
        return response.ok({ body });
      })
    );

  // Approve: apply the change, then record the outcome.
  router.versioned
    .post({
      path: improvementApprovePath,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Approve an improvement',
      description:
        'Applies the suggested change under the caller’s own privileges and marks the improvement applied. A failure is recorded on the improvement, which stays approvable so it can be retried.',
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: { request: { params: improvementIdParamsSchema } },
      },
      withFeedbackLoopFeatureFlag(getFeedbackLoopEnabled, async (ctx, request, response) => {
        const core = await ctx.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const auditLogger = core.security.audit.logger;
        const spaceId = resolveSpaceId(await getSpaces(), request);
        const { improvementId } = request.params;

        const improvement = await getImprovementsService().getById(spaceId, improvementId);
        if (!improvement) {
          return response.notFound({
            body: { message: `Improvement [${improvementId}] was not found.` },
          });
        }
        if (!isActionable(improvement)) {
          return response.conflict({
            body: {
              message: `Improvement [${improvementId}] was already ${improvement.status} and cannot be approved.`,
            },
          });
        }

        const by = core.security.authc.getCurrentUser()?.username;
        const resolvedAt = new Date().toISOString();

        try {
          const appliedTargetId = await applyImprovement(improvement, {
            esClient,
            aiIndexService: getAiIndexService(),
            workflows: getWorkflowProvider(),
            spaceId,
            request,
            logger,
          });

          const applied: ImprovementEnvelope = {
            ...improvement,
            status: 'applied',
            applied_at: resolvedAt,
            resolution: { ...(by ? { by } : {}), applied_target_id: appliedTargetId },
          };
          await getImprovementsService().update(spaceId, applied);
          auditLogger.log(
            improvementAuditEvent({ action: ImprovementAuditAction.APPROVE, id: improvementId })
          );

          const body: MutateImprovementResponse = { improvement: applied };
          return response.ok({ body });
        } catch (error) {
          if (!(error instanceof ApplyImprovementError)) {
            auditLogger.log(
              improvementAuditEvent({
                action: ImprovementAuditAction.APPROVE,
                id: improvementId,
                error: error instanceof Error ? error : new Error(String(error)),
              })
            );
            throw error;
          }

          // The suggestion keeps its own state apart from the failure, so a retry after the cause is
          // fixed applies exactly what was originally proposed.
          await getImprovementsService().update(spaceId, {
            ...improvement,
            status: 'failed',
            resolution: { ...(by ? { by } : {}), error: error.message },
          });
          auditLogger.log(
            improvementAuditEvent({
              action: ImprovementAuditAction.APPROVE,
              id: improvementId,
              error,
            })
          );

          return response.badRequest({ body: { message: error.message } });
        }
      })
    );

  // Reject: record the decision so the suggestion stops being offered.
  router.versioned
    .post({
      path: improvementRejectPath,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Reject an improvement',
      description:
        'Marks the improvement rejected. It is hidden from the review list but still handed to later runs, so the agent stops proposing it.',
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: { request: { params: improvementIdParamsSchema } },
      },
      withFeedbackLoopFeatureFlag(getFeedbackLoopEnabled, async (ctx, request, response) => {
        const core = await ctx.core;
        const auditLogger = core.security.audit.logger;
        const spaceId = resolveSpaceId(await getSpaces(), request);
        const { improvementId } = request.params;

        const improvement = await getImprovementsService().getById(spaceId, improvementId);
        if (!improvement) {
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
        const rejected: ImprovementEnvelope = {
          ...improvement,
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          resolution: { ...(by ? { by } : {}) },
        };

        await getImprovementsService().update(spaceId, rejected);
        auditLogger.log(
          improvementAuditEvent({ action: ImprovementAuditAction.REJECT, id: improvementId })
        );

        const body: MutateImprovementResponse = { improvement: rejected };
        return response.ok({ body });
      })
    );
};
