/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import { StepCategory, type StepContext } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import type { IdentifyFeaturesResult, IterationResult } from '@kbn/streams-schema';
import { TaskStatus, baseFeatureSchema, isComputedFeature } from '@kbn/streams-schema';
import type { GetScopedClients } from '../../routes/types';
import {
  getFeaturesIdentificationTaskId,
  type FeaturesIdentificationTaskParams,
} from '../tasks/task_definitions/features_identification';
import {
  KI_FEATURES_EXTRACT_STREAM_STEP_TYPE,
  COORDINATOR_INTERVAL_MINUTES,
} from '../../../common/constants';

const toFeatureSummary = ({ id, title }: { id: string; title?: string }) => ({ id, title });

const formatIterationsSummary = (
  iterations: IterationResult[],
  totalTokensUsed?: ChatCompletionTokenCount
): string => {
  if (iterations.length === 0) return '';

  const lines = iterations.map((iter) => {
    const stats = `${iter.durationMs}ms, ${iter.tokensUsed.total} tokens, ${iter.newFeatures.length} new, ${iter.updatedFeatures.length} updated`;
    return `  #${iter.iteration} ${iter.state} (${stats})`;
  });
  const tokensLine = totalTokensUsed ? ` | total tokens: ${totalTokensUsed.total}` : '';
  return `\nCompleted iterations (${iterations.length})${tokensLine}:\n${lines.join('\n')}`;
};

const inputSchema = z.object({
  streamName: z.string(),
});

const featureSummarySchema = baseFeatureSchema.pick({
  id: true,
  title: true,
});

const tokenCountSchema = z.object({
  prompt: z.number(),
  completion: z.number(),
  total: z.number(),
  cached: z.number(),
});

const ZERO_TOKENS = { prompt: 0, completion: 0, total: 0, cached: 0 };

const iterationSchema = z.object({
  iteration: z.number(),
  durationMs: z.number(),
  state: z.string(),
  tokensUsed: tokenCountSchema,
  newFeatures: z.array(featureSummarySchema),
  updatedFeatures: z.array(featureSummarySchema),
});

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_DURATION_MS = (COORDINATOR_INTERVAL_MINUTES - 1) * 60_000;
const MAX_CONSECUTIVE_ERRORS = 3;

// NotStarted is terminal here: if the coordinator failed to schedule this stream's task,
// the poller should exit immediately rather than wait for a task that will never run.
const TERMINAL_STATUSES = new Set<string>([
  TaskStatus.Completed,
  TaskStatus.Acknowledged,
  TaskStatus.Failed,
  TaskStatus.Stale,
  TaskStatus.Canceled,
  TaskStatus.NotStarted,
]);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const parseScheduledStreams = (workflowContext: StepContext): Array<{ streamName: string }> => {
  const raw = (workflowContext.steps?.select_streams?.output as Record<string, unknown> | undefined)
    ?.scheduled;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is { streamName: string } =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).streamName === 'string'
  );
};

export const registerKiFeaturesExtractStreamStep = ({
  workflowsExtensions,
  getScopedClients,
}: {
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup;
  getScopedClients: GetScopedClients;
}) => {
  workflowsExtensions.registerStepDefinition({
    id: KI_FEATURES_EXTRACT_STREAM_STEP_TYPE,
    label: 'KI Features Extraction (per-stream)',
    description:
      'Polls a scheduled KI features identification task for a single stream until completion and reports results.',
    category: StepCategory.Kibana,
    inputSchema,
    outputSchema: z.object({
      streamName: z.string(),
      status: z.string(),
      summary: z.object({
        durationMs: z.number(),
        tokensUsed: tokenCountSchema,
        features: z.object({
          llm: z.array(featureSummarySchema),
          computed: z.array(featureSummarySchema),
        }),
      }),
      iterations: z.array(iterationSchema),
    }),
    handler: async (context) => {
      const { streamName } = inputSchema.parse(context.input);
      const taskId = getFeaturesIdentificationTaskId(streamName);

      const request = context.contextManager.getFakeRequest();
      const { taskClient } = await getScopedClients({ request });

      const pollStart = Date.now();

      const processTerminal = async () => {
        const task = await taskClient.get<FeaturesIdentificationTaskParams, IdentifyFeaturesResult>(
          taskId
        );

        const createdAt = task.created_at ? new Date(task.created_at).getTime() : pollStart;
        const endedAtRaw = task.last_completed_at ?? task.last_failed_at;
        const endedAt = endedAtRaw ? new Date(endedAtRaw).getTime() : Date.now();
        const durationMs = endedAt - createdAt;

        if (task.status === TaskStatus.Completed || task.status === TaskStatus.Acknowledged) {
          const { features: rawFeatures, iterations = [], totalTokensUsed } = task.task.payload;
          const llm = rawFeatures.filter((f) => !isComputedFeature(f)).map(toFeatureSummary);
          const computed = rawFeatures.filter(isComputedFeature).map(toFeatureSummary);

          context.logger.info(
            `Stream ${streamName}: completed with ${rawFeatures.length} features (${computed.length} computed, ${llm.length} llm) in ${durationMs}ms`
          );
          return {
            output: {
              streamName,
              status: 'completed',
              summary: {
                durationMs,
                tokensUsed: totalTokensUsed ?? ZERO_TOKENS,
                features: { llm, computed },
              },
              iterations,
            },
          };
        }

        if (task.status === TaskStatus.Failed) {
          const { iterations = [], totalTokensUsed } = task.task.payload ?? {};
          const iterationsSummary = formatIterationsSummary(iterations, totalTokensUsed);
          throw new Error(
            `Stream ${streamName}: task failed — ${task.task.error}${iterationsSummary}`
          );
        }

        throw new Error(`Stream ${streamName}: task ended with status ${task.status}`);
      };

      let consecutiveErrors = 0;

      while (Date.now() - pollStart < MAX_POLL_DURATION_MS) {
        if (context.abortSignal.aborted) {
          throw new Error(`Stream ${streamName}: polling was aborted`);
        }

        let result;
        try {
          result = await taskClient.getStatus(taskId);
          consecutiveErrors = 0;
        } catch (err) {
          consecutiveErrors++;
          context.logger.warn(
            `Stream ${streamName}: transient error polling status (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}) — ${err}`
          );
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            throw new Error(
              `Stream ${streamName}: polling failed after ${MAX_CONSECUTIVE_ERRORS} consecutive errors`
            );
          }
          await sleep(POLL_INTERVAL_MS);
          continue;
        }

        if (TERMINAL_STATUSES.has(result.status)) {
          return await processTerminal();
        }

        await sleep(POLL_INTERVAL_MS);
      }

      throw new Error(`Stream ${streamName}: polling timed out after ${MAX_POLL_DURATION_MS}ms`);
    },
    onCancel: async (context) => {
      const scheduled = parseScheduledStreams(context.contextManager.getContext());

      if (scheduled.length === 0) {
        context.logger.info('onCancel: no scheduled streams to cancel');
        return;
      }

      const request = context.contextManager.getFakeRequest();
      const { taskClient } = await getScopedClients({ request });

      context.logger.info(`onCancel: cancelling ${scheduled.length} scheduled tasks`);

      await Promise.allSettled(
        scheduled.map(async (item) => {
          try {
            await taskClient.cancel(getFeaturesIdentificationTaskId(item.streamName));
          } catch (err) {
            context.logger.warn(
              `onCancel: failed to cancel task for stream ${item.streamName}: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        })
      );
    },
  });
};
