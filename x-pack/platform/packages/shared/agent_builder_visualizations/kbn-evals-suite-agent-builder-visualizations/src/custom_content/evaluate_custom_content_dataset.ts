/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { Conversation } from '@kbn/agent-builder-common';
import {
  getStringMeta,
  type AgentBuilderClient,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type Evaluator,
  type ExperimentTask,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { skippedResult, withLowScoreLogging } from '../evaluator_utils';
import { createEsqlExecutionEvaluator } from '../evaluators/esql_execution';
import { createEsqlQueryRunner } from '../evaluators/esql_query_runner';
import {
  getLastCustomContentAttachmentId,
  getLastWrittenDashboardId,
  getOtherRenderers,
  getToolErrors,
  readStoredCustomContent,
  readStoredCustomContentFromDashboard,
  toLoggedVisualizations,
  type CustomContentTaskOutput,
} from './custom_content_output';
import { createDataExpectationEvaluator } from './evaluators/data_expectation';
import { createEditEvaluator } from './evaluators/edit';
import { createQueryContentsEvaluator } from './evaluators/query_contents';
import { createRowLimitEvaluator } from './evaluators/row_limit';
import { createRowOrderEvaluator } from './evaluators/row_order';
import { createTemplateColumnsEvaluator } from './evaluators/template_columns';
import { createTemplateValidityEvaluator } from './evaluators/template_validity';
import { getToolIds } from '../extract_visualization';
import type { CustomContentDatasetExample, CustomContentEvaluator } from './types';

// A static example expects no query, so there is nothing to execute.
const skipStaticExamples = (evaluator: CustomContentEvaluator): CustomContentEvaluator => ({
  ...evaluator,
  evaluate: async (params) =>
    params.expected?.data === 'static'
      ? skippedResult('Static example: no query expected.')
      : evaluator.evaluate(params),
});

export type EvaluateCustomContentDataset = ({
  dataset,
}: {
  dataset: {
    name: string;
    description: string;
    examples: CustomContentDatasetExample[];
  };
}) => Promise<void>;

// The converse turn surfaces the agent trace under `agentTraceId`; the framework trace-based
// evaluators look for `traceId`.
const useAgentTraceId = (evaluator: Evaluator): CustomContentEvaluator => ({
  ...evaluator,
  evaluate: async ({ input, output, expected, metadata }) =>
    evaluator.evaluate({
      input,
      output: { ...output, traceId: output.agentTraceId ?? output.traceId },
      expected,
      metadata,
    }),
});

/**
 * Scores custom content panels from what the agent stored, not from the tool result, which
 * deliberately carries neither the template nor the height. The task reads the panel back from the
 * conversation's visualization attachment.
 */
export function createEvaluateCustomContentDataset({
  agentBuilderClient,
  agentId: defaultAgentId,
  evaluators,
  executorClient,
  esClient,
  log,
}: {
  agentBuilderClient: AgentBuilderClient;
  agentId: string;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  esClient: EsClient;
  log: ToolingLog;
}): EvaluateCustomContentDataset {
  return async function evaluateCustomContentDataset({ dataset: { name, description, examples } }) {
    const dataset = { name, description, examples } satisfies EvaluationDataset;

    // One runner per dataset run, so three evaluators executing a query hit Elasticsearch once.
    const runQuery = createEsqlQueryRunner(esClient);

    const esqlExecutionEvaluator = createEsqlExecutionEvaluator<
      CustomContentDatasetExample,
      CustomContentTaskOutput
    >({
      runQuery,
      queryExtractor: (output) => (output.after?.esql ? [output.after.esql] : []),
      includeHitDetection: true,
    });

    const task: ExperimentTask<CustomContentDatasetExample, CustomContentTaskOutput> = async ({
      input,
      metadata,
    }) => {
      const agentId = getStringMeta(metadata, 'agentId') ?? defaultAgentId;
      const first = await agentBuilderClient.converse({ agentId, input: input?.question ?? '' });

      const followUp = input?.followUp;
      if (followUp && !first.conversationId) {
        throw new Error(
          `First turn returned no conversationId; cannot run follow-up "${followUp}"`
        );
      }
      const last = followUp
        ? await agentBuilderClient.converse({
            agentId,
            input: followUp,
            conversationId: first.conversationId,
          })
        : first;

      const steps = [...(first.steps ?? []), ...(followUp ? last.steps ?? [] : [])];
      // "Create a custom panel" can end in a standalone visualization or in a dashboard written by
      // generate_dashboard. Both are valid; score whichever the agent used.
      const visualizationId = getLastCustomContentAttachmentId(steps);
      const dashboardId = visualizationId ? undefined : getLastWrittenDashboardId(steps);
      const attachmentId = visualizationId ?? dashboardId;

      let stored: ReturnType<typeof readStoredCustomContent> = { versionCount: 0 };
      let storedIn: CustomContentTaskOutput['storedIn'] = 'none';
      if (attachmentId && last.conversationId) {
        const conversation = await agentBuilderClient.getConversation<Conversation>(
          last.conversationId
        );
        if (visualizationId) {
          stored = readStoredCustomContent(conversation, visualizationId);
          storedIn = 'visualization';
        } else if (dashboardId) {
          stored = readStoredCustomContentFromDashboard(conversation, dashboardId);
          storedIn = 'dashboard';
        }
      }

      const toolIds = getToolIds({ steps });
      const followUpToolIds = followUp ? getToolIds({ steps: last.steps ?? [] }) : undefined;
      const otherRenderers = getOtherRenderers(steps);
      log.info(
        `[custom content eval] "${(input?.question ?? '').slice(0, 60)}": stored in ${storedIn}` +
          `${otherRenderers.length > 0 ? `, also created ${otherRenderers.join('/')}` : ''}; ` +
          `tools: ${getToolIds({ steps: first.steps ?? [] }).join(' > ') || '(none)'}` +
          `${followUpToolIds ? ` | follow-up: ${followUpToolIds.join(' > ') || '(none)'}` : ''}`
      );
      getToolErrors(steps).forEach((error) =>
        log.info(`[custom content eval]   tool error: ${error}`)
      );

      return {
        errors: [],
        messages: [{ message: last.message }],
        steps,
        toolIds,
        followUpToolIds,
        visualizations: toLoggedVisualizations(stored.after, attachmentId),
        otherRenderers,
        after: stored.after,
        before: stored.before,
        versionCount: stored.versionCount,
        storedIn,
        agentTraceId: last.traceId,
        turns: followUp ? 2 : 1,
        prompts: last.prompts ?? [],
      };
    };

    // Quality evaluators score 0..1 and get low-score logging; trace-based evaluators report
    // counts and seconds, so a "low" value means nothing there.
    const qualityEvaluators = [
      createTemplateValidityEvaluator(),
      createDataExpectationEvaluator(),
      skipStaticExamples(esqlExecutionEvaluator as CustomContentEvaluator),
      createQueryContentsEvaluator(),
      createRowLimitEvaluator(),
      createRowOrderEvaluator({ runQuery }),
      createTemplateColumnsEvaluator({ runQuery }),
      createEditEvaluator(),
    ].map((evaluator) => withLowScoreLogging(evaluator as CustomContentEvaluator, log));

    await executorClient.runExperiment({ datasets: [dataset], task }, [
      ...qualityEvaluators,
      ...Object.values(evaluators.traceBasedEvaluators).map(useAgentTraceId),
    ]);
  };
}
