/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { feedbackContextStepCommonDefinition } from '../../common/step_types/feedback_context';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { buildFeedbackContext } from '../feedback_analysis/context';
import { InvalidSignalWindowError } from '../feedback_analysis/errors';
import { reconcileImprovements } from '../improvements/reconcile';
import { OPEN_IMPROVEMENT_STATUSES } from '../../common/http_api/improvements';
import { MAX_IMPROVEMENTS_PAGE_SIZE } from '../../common/constants';
import type { FeedbackAnalysisStepDependencies } from './helpers';
import {
  assertContextEngineEnabled,
  assertFeedbackLoopEnabled,
  requireProposalsProvider,
} from './helpers';

/** Assembles everything one analysis run reads. */
export const getFeedbackContextStepDefinition = ({
  getAiIndexService,
  getImprovementsService,
  getProposalsProvider,
  isContextEngineEnabled,
  isFeedbackLoopEnabled,
  logger,
}: FeedbackAnalysisStepDependencies) =>
  createServerStepDefinition({
    ...feedbackContextStepCommonDefinition,
    handler: async (context) => {
      const spaceId = context.contextManager.getContext().workflow.spaceId;
      await assertContextEngineEnabled(isContextEngineEnabled, spaceId);
      await assertFeedbackLoopEnabled(isFeedbackLoopEnabled);

      const { ai_index_id: aiIndexId } = context.input;
      const esClient = context.contextManager.getScopedEsClient();

      const proposalsProvider = requireProposalsProvider(getProposalsProvider);
      // A decision made on a proposal reaches the store only here or on a list, and the run
      // reads its history from the store.
      try {
        const improvements = getImprovementsService(esClient, spaceId);
        const { items } = await improvements.list({
          aiIndexId,
          status: [...OPEN_IMPROVEMENT_STATUSES],
          size: MAX_IMPROVEMENTS_PAGE_SIZE,
        });
        await reconcileImprovements({
          improvements: items,
          improvementsService: improvements,
          proposals: proposalsProvider,
          context: { spaceId, request: context.contextManager.getFakeRequest() },
          logger,
        });
      } catch (error) {
        logger.warn(
          `Could not reconcile improvements for AI index '${aiIndexId}' before the run: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }

      try {
        const {
          agent_id: agentId,
          briefing,
          output_schema: outputSchema,
          has_signals: hasSignals,
          can_analyze: canAnalyze,
          run,
        } = await buildFeedbackContext(aiIndexId, spaceId, {
          esClient,
          aiIndexService: getAiIndexService(),
          improvementsService: getImprovementsService(esClient, spaceId),
        });

        logger.debug(
          () =>
            `Feedback context for AI index '${aiIndexId}': ${run.signal_count} signal(s) from ${run.signal_spaces.length} space(s), signals=${hasSignals}, analyzable=${canAnalyze}`
        );

        return {
          output: {
            agent_id: agentId,
            briefing,
            output_schema: outputSchema,
            has_signals: hasSignals,
            can_analyze: canAnalyze,
            signal_window: run.signal_window,
            signal_spaces: run.signal_spaces,
            signal_count: run.signal_count,
          },
        };
      } catch (error) {
        if (error instanceof AiIndexNotFoundError) {
          throw new ExecutionError({
            type: 'NotFoundError',
            message: `AI index '${aiIndexId}' not found`,
          });
        }
        if (error instanceof InvalidSignalWindowError) {
          throw new ExecutionError({ type: 'ValidationError', message: error.message });
        }
        throw error;
      }
    },
  });
