/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { IMPROVEMENT_ACTIONS } from '../../common/http_api/improvement_actions';
import { recordImprovementsStepCommonDefinition } from '../../common/step_types/record_improvements';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { recordImprovements } from '../feedback_analysis/record_improvements';
import { improvementAuditEvent } from '../routes/audit_events';
import type { FeedbackAnalysisStepDependencies } from './helpers';
import { assertContextEngineEnabled, assertFeedbackLoopEnabled } from './helpers';

/**
 * Records what an analysis run proposed.
 *
 * A step rather than an HTTP route because the write is not a plain index operation — each
 * proposal's identity is derived here, and appending a revision means retiring the lineage's
 * current head under optimistic concurrency control. That contract belongs to the improvements
 * service, and a step is how a workflow reaches it without going back out over HTTP.
 */
export const getRecordImprovementsStepDefinition = ({
  getAiIndexService,
  getImprovementsService,
  getAuditLogger,
  isContextEngineEnabled,
  isFeedbackLoopEnabled,
  checkWritePrivilege,
  logger,
}: FeedbackAnalysisStepDependencies) =>
  createServerStepDefinition({
    ...recordImprovementsStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      await assertContextEngineEnabled(isContextEngineEnabled, request);
      await assertFeedbackLoopEnabled(isFeedbackLoopEnabled);

      if (!(await checkWritePrivilege(request))) {
        throw new ExecutionError({
          type: 'PermissionError',
          message: 'Insufficient privileges to record Context Engine improvements',
        });
      }

      const {
        ai_index_id: aiIndexId,
        agent_run_id: agentRunId,
        signal_window: signalWindow,
        signal_spaces: signalSpaces,
        conversation_id: conversationId,
        improvements,
      } = context.input;

      const esClient = context.contextManager.getScopedEsClient();
      const auditLogger = await getAuditLogger(request);

      try {
        // Read back rather than taken from the step input: the policy is a property of the index,
        // and a run briefed before it changed must not be able to write under the old one.
        const { feedback_analysis: feedbackAnalysis } = await getAiIndexService().get(aiIndexId);
        const allowedActions = feedbackAnalysis?.allowed_actions ?? [...IMPROVEMENT_ACTIONS];

        const result = await recordImprovements({
          aiIndexId,
          agentRunId,
          signalWindow,
          signalSpaces,
          allowedActions,
          proposals: improvements,
          improvementsService: getImprovementsService(esClient),
        });

        // The run is over once its proposals are stored, whether or not it had any: leaving the
        // marker behind would show an analysis as running long after it stopped.
        if (conversationId) {
          const outcome = await getAiIndexService().finishFeedbackRun(aiIndexId, {
            conversationId,
            recorded: result.recorded.length,
          });

          if (outcome === 'superseded') {
            logger.debug(
              () =>
                `Analysis run '${agentRunId}' on AI index '${aiIndexId}' finished after a newer run started; leaving the newer run marked as in flight`
            );
          }
        }

        auditLogger?.log(improvementAuditEvent({ aiIndexId, recorded: result.recorded.length }));
        logger.debug(
          () =>
            `Analysis run '${agentRunId}' on AI index '${aiIndexId}': recorded ${result.recorded.length}, skipped ${result.skipped.length}`
        );

        return { output: result };
      } catch (error) {
        auditLogger?.log(
          improvementAuditEvent({
            aiIndexId,
            error: error instanceof Error ? error : new Error(String(error)),
          })
        );
        if (error instanceof AiIndexNotFoundError) {
          throw new ExecutionError({
            type: 'NotFoundError',
            message: `AI index '${aiIndexId}' not found`,
          });
        }
        throw error;
      }
    },
  });
