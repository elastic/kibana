/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { v4 as uuidv4 } from 'uuid';
import { feedbackContextStepCommonDefinition } from '../../common/step_types/feedback_context';
import { AiIndexNotFoundError } from '../ai_indices/errors';
import { buildFeedbackContext } from '../feedback_analysis/context';
import { InvalidSignalWindowError } from '../feedback_analysis/errors';
import type { FeedbackAnalysisStepDependencies } from './helpers';
import { assertContextEngineEnabled, assertFeedbackLoopEnabled } from './helpers';

/**
 * Assembles everything one analysis run reads.
 *
 * A step rather than an HTTP route because the workflow is the only caller, and because a step
 * runs the same selection code the interactive hand-off would: keeping it in one tested place is
 * the point, not the transport.
 */
export const getFeedbackContextStepDefinition = ({
  getAiIndexService,
  getImprovementsService,
  isContextEngineEnabled,
  isFeedbackLoopEnabled,
  logger,
}: FeedbackAnalysisStepDependencies) =>
  createServerStepDefinition({
    ...feedbackContextStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      await assertContextEngineEnabled(isContextEngineEnabled, request);
      await assertFeedbackLoopEnabled(isFeedbackLoopEnabled);

      const { ai_index_id: aiIndexId } = context.input;
      const esClient = context.contextManager.getScopedEsClient();

      try {
        const {
          agent_id: agentId,
          briefing,
          output_schema: outputSchema,
          has_signals: hasSignals,
          run,
        } = await buildFeedbackContext(aiIndexId, {
          esClient,
          aiIndexService: getAiIndexService(),
          improvementsService: getImprovementsService(esClient),
        });

        logger.debug(
          () =>
            `Feedback context for AI index '${aiIndexId}': ${run.signal_count} signal(s) from ${run.signal_spaces.length} space(s), analyzable=${hasSignals}`
        );

        // Minted unconditionally to keep the output shape fixed, but only recorded when the agent
        // will actually run: a window with nothing to analyze is not a run anyone can watch.
        const conversationId = uuidv4();
        if (hasSignals) {
          await getAiIndexService().startFeedbackRun(aiIndexId, {
            conversationId,
            startedAt: new Date().toISOString(),
          });
        }

        return {
          output: {
            agent_id: agentId,
            briefing,
            output_schema: outputSchema,
            has_signals: hasSignals,
            conversation_id: conversationId,
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
