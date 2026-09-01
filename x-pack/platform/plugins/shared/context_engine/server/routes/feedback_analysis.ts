/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, IRouter, KibanaResponseFactory } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import {
  AI_INDEX_INTERNAL_API_VERSION,
  IMPROVEMENTS_INTERNAL_API_VERSION,
  MAX_AI_INDEX_ID_LENGTH,
  MAX_FEEDBACK_ANALYSIS_TIME_RANGE_FROM_LENGTH,
  aiIndexFeedbackContextPath,
  improvementsPath,
} from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type { GetFeedbackContextResponse } from '../../common/http_api/feedback_context';
import type { RecordImprovementsResponse } from '../../common/http_api/improvements';
import { IMPROVEMENT_ACTIONS } from '../../common/http_api/improvement_actions';
import { validateAiIndexId } from '../../common/validation';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import type { AiIndexService } from '../ai_indices/service';
import { InvalidSignalWindowError } from '../feedback_analysis/errors';
import { buildFeedbackContext } from '../feedback_analysis/context';
import { recordImprovements } from '../feedback_analysis/record_improvements';
import type { ImprovementsServiceApi } from '../improvements/service';
import { improvementAuditEvent } from './audit_events';
import { withContextEngineFeatureFlag } from './with_feature_flag';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const WRITE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.writeContextEngine] },
};

/**
 * Hard ceiling on the proposals one request may carry — a bound on the request body, not the
 * policy. The policy cap is applied per proposal inside {@link recordImprovements}, so a run that
 * over-proposes gets a `skipped` entry it can report rather than a 400 it cannot interpret.
 */
const MAX_IMPROVEMENTS_PER_REQUEST = 200;

/** Spaces are Kibana ids; the cap is a bound on the request, not a product limit. */
const MAX_SIGNAL_SPACES = 1000;

const aiIndexIdSchema = schema.string({
  minLength: 1,
  maxLength: MAX_AI_INDEX_ID_LENGTH,
  validate: validateAiIndexId,
  meta: { description: 'The unique identifier of the AI index.' },
});

const aiIndexIdParamsSchema = schema.object({ aiIndexId: aiIndexIdSchema });

const recordImprovementsBodySchema = schema.object({
  ai_index_id: aiIndexIdSchema,
  agent_run_id: schema.string({
    minLength: 1,
    maxLength: 1024,
    meta: { description: 'The workflow execution that produced these proposals.' },
  }),
  signal_window: schema.object({
    from: schema.string({ minLength: 1, maxLength: MAX_FEEDBACK_ANALYSIS_TIME_RANGE_FROM_LENGTH }),
    to: schema.string({ minLength: 1, maxLength: MAX_FEEDBACK_ANALYSIS_TIME_RANGE_FROM_LENGTH }),
  }),
  signal_spaces: schema.arrayOf(schema.string({ minLength: 1, maxLength: 1024 }), {
    maxSize: MAX_SIGNAL_SPACES,
    defaultValue: [],
  }),
  // Validated per item against the agent output contract in `recordImprovements`, which reports a
  // reason per proposal instead of failing the batch. Bounded here only so the body cannot grow
  // without limit.
  improvements: schema.arrayOf(schema.object({}, { unknowns: 'allow' }), {
    maxSize: MAX_IMPROVEMENTS_PER_REQUEST,
    defaultValue: [],
  }),
});

const handleError = (error: unknown, response: KibanaResponseFactory) => {
  if (error instanceof AiIndexNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }
  if (error instanceof InvalidSignalWindowError) {
    return response.badRequest({ body: { message: error.message } });
  }
  throw error;
};

/**
 * The two endpoints an analysis run talks to: one that hands it everything to look at, and one
 * that records what it concluded.
 *
 * Both live behind the feedback-loop setting, and both run as the caller — the scheduled run is a
 * workflow owned by a real user, so there is no path here that reads or writes as Kibana.
 */
export const registerFeedbackAnalysisRoutes = ({
  router,
  getAiIndexService,
  getImprovementsService,
  getFeedbackLoopEnabled,
}: {
  router: IRouter;
  getAiIndexService: () => AiIndexService;
  getImprovementsService: (esClient: ElasticsearchClient) => ImprovementsServiceApi;
  getFeedbackLoopEnabled: () => Promise<boolean>;
}) => {
  // Everything one analysis run reads, assembled server-side.
  router.versioned
    .get({
      path: aiIndexFeedbackContextPath,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'Get the feedback analysis context for an AI index',
      description:
        'Selects the signals relevant to one AI index, folds them into ranked patterns, and renders the briefing an analysis run is given.',
    })
    .addVersion(
      {
        version: AI_INDEX_INTERNAL_API_VERSION,
        validate: { request: { params: aiIndexIdParamsSchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        if (!(await getFeedbackLoopEnabled())) {
          return response.notFound();
        }

        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const { aiIndexId } = request.params;

        try {
          const body: GetFeedbackContextResponse = await buildFeedbackContext(aiIndexId, {
            esClient,
            aiIndexService: getAiIndexService(),
            improvementsService: getImprovementsService(esClient),
          });
          return response.ok({ body });
        } catch (error) {
          return handleError(error, response);
        }
      })
    );

  // What the run concluded.
  router.versioned
    .post({
      path: improvementsPath,
      security: WRITE_SECURITY,
      access: 'internal',
      summary: 'Record proposed improvements',
      description: `Records what an analysis run proposed. The server derives each improvement's identity, so re-analyzing the same latent problem appends a revision rather than creating a duplicate. Proposals outside the AI index's \`allowed_actions\` are rejected. Actions: ${IMPROVEMENT_ACTIONS.join(
        ', '
      )}.`,
    })
    .addVersion(
      {
        version: IMPROVEMENTS_INTERNAL_API_VERSION,
        validate: { request: { body: recordImprovementsBodySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        if (!(await getFeedbackLoopEnabled())) {
          return response.notFound();
        }

        const core = await ctx.core;
        const auditLogger = core.security.audit.logger;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const {
          ai_index_id: aiIndexId,
          agent_run_id: agentRunId,
          signal_window: signalWindow,
          signal_spaces: signalSpaces,
          improvements,
        } = request.body;

        try {
          // Read back rather than trusted from the body: the policy is a property of the index, and
          // a run that was briefed before it changed must not be able to write under the old one.
          const aiIndex = await getAiIndexService().get(aiIndexId);
          const allowedActions = aiIndex.feedback_analysis?.allowed_actions ?? [
            ...IMPROVEMENT_ACTIONS,
          ];

          const body: RecordImprovementsResponse = await recordImprovements({
            aiIndexId,
            agentRunId,
            signalWindow,
            signalSpaces,
            allowedActions,
            proposals: improvements,
            improvementsService: getImprovementsService(esClient),
          });

          auditLogger.log(improvementAuditEvent({ aiIndexId, recorded: body.recorded.length }));
          return response.ok({ body });
        } catch (error) {
          auditLogger.log(
            improvementAuditEvent({
              aiIndexId,
              error: error instanceof Error ? error : new Error(String(error)),
            })
          );
          return handleError(error, response);
        }
      })
    );
};
