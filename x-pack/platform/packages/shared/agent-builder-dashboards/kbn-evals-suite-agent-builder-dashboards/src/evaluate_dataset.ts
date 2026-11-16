/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { Conversation } from '@kbn/agent-builder-common';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE, isSection } from '@kbn/agent-builder-dashboards-common';
import { VISUALIZATION_ATTACHMENT_TYPE } from '@kbn/agent-builder-visualizations-common';
import {
  createTrajectoryEvaluator,
  getStringMeta,
  type AgentBuilderClient,
  type AgentBuilderClientResponse,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type EvaluationResult,
  type Evaluator,
  type ExperimentTask,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { onlyWhen, withLowScoreLogging } from './evaluator_utils';
import { createControlQueriesEvaluator } from './evaluators/control_queries';
import { dashboardControlSourcingEvaluator } from './evaluators/control_sourcing';
import {
  dashboardChartStylingEvaluator,
  dashboardColorFormatEvaluator,
  dashboardCompositionOrderEvaluator,
  dashboardControlsEvaluator,
  dashboardLayoutRulesEvaluator,
  dashboardPanelTitlesEvaluator,
  dashboardTitlesEvaluator,
} from './evaluators/dashboard_rule_evaluators';
import { dashboardRoutingEvaluator } from './evaluators/dashboard_routing';
import { panelConfigReferenceEvaluator } from './evaluators/panel_config_reference';
import { dashboardStructureEvaluator } from './evaluators/dashboard_structure';
import { dashboardTimeRangeEvaluator } from './evaluators/dashboard_time_range';
import {
  enhanceDefectResolutionEvaluator,
  enhanceModeComplianceEvaluator,
  enhanceModeQuestionEvaluator,
  enhanceNoRegressionEvaluator,
} from './evaluators/enhance_evaluators';
import { enhanceScopeEvaluator } from './evaluators/enhance_scope_evaluator';
import { dashboardLayoutEditEvaluator } from './evaluators/layout_edit';
import { dashboardPanelEditsEvaluator } from './evaluators/panel_edits';
import { dashboardReplaceConfirmationEvaluator } from './evaluators/replace_confirmation';
import { createReplyEvaluator } from './evaluators/reply_judge';
import { createUnavailableRequestsEvaluator } from './evaluators/unavailable_requests';
import {
  combineTurnSteps,
  findAskUserQuestionPrompt,
  findModeOptionIndex,
  getLastWrittenDashboardId,
  getToolErrors,
  readDashboardVersions,
  type AskUserQuestionPrompt,
  type EnhanceMode,
} from './extract_dashboard';
import { ESQL_QUERY_RESULTS_ATTACHMENT_TYPE } from './fixtures/dissect_logs_results';
import { getToolIds } from './skill_selection_evaluators';
import type {
  DashboardAgentEvaluator,
  DashboardAgentTaskOutput,
  DashboardDatasetExample,
  EvaluateDataset,
} from './types';

/** Id of the seeded attachment, so the task can find it on the conversation afterwards. */
export const SEEDED_DASHBOARD_ID = 'eval-seeded-dashboard';
/** Id Discover gives the ES|QL results attachment it sends with the "AI Agent" action. */
export const SEEDED_ESQL_RESULTS_ID = 'esql-query-results';
const SCREEN_CONTEXT_ID = 'screen-context';

// The converse turns surface their agent traces under `agentTraceIds`; the
// framework trace-based evaluators read one `traceId`. Token counts, tool
// calls and latency add up across turns, so a two-turn example (the answered
// mode question) reports the sum of both traces.
const useAgentTraceIds = (evaluator: Evaluator): DashboardAgentEvaluator => ({
  ...evaluator,
  evaluate: async ({ input, output, expected, metadata }) => {
    const traceIds = output.agentTraceIds?.length
      ? output.agentTraceIds
      : [output.agentTraceId ?? output.traceId];
    const results: EvaluationResult[] = await Promise.all(
      traceIds.map((traceId) =>
        evaluator.evaluate({ input, output: { ...output, traceId }, expected, metadata })
      )
    );
    const scores = results.flatMap(({ score }) => (typeof score === 'number' ? [score] : []));
    if (results.length === 1 || scores.length < results.length) {
      return results.find(({ score }) => typeof score !== 'number') ?? results[0];
    }
    return {
      ...results[0],
      score: scores.reduce((sum, score) => sum + score, 0),
      explanation: `Sum over ${results.length} turns: ${scores.join(' + ')}`,
      metadata: { turns: results },
    };
  },
});

/**
 * Answers an `ask_user_question` prompt with the option for a mode, or free
 * text when the answer is text or no option fits the mode.
 */
const answerModeQuestion = (
  prompt: AskUserQuestionPrompt,
  answer: EnhanceMode | { text: string }
): Record<string, unknown> => ({
  [prompt.id]: {
    answers: prompt.questions.map(({ options }, index) => {
      if (index > 0) {
        return { skipped: true };
      }
      if (typeof answer !== 'string') {
        return { custom: answer.text };
      }
      const choice = findModeOptionIndex(options, answer);
      return choice === -1
        ? { custom: answer === 'appearance' ? 'Appearance only' : 'Appearance and content' }
        : { choice: [choice] };
    }),
  },
});

/** Whether the turn must write a dashboard: not when nothing can be built, nor before the user confirms a replacement. */
const expectsDashboard = (expected: DashboardDatasetExample['output']): boolean =>
  (expected?.route === 'dashboard' && !expected.noDashboard && !expected.replaceConfirmation) ||
  expected?.enhance !== undefined ||
  expected?.scopedEnhance !== undefined;

export function createEvaluateDataset({
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
}): EvaluateDataset {
  const readDashboards = async (
    last: AgentBuilderClientResponse,
    steps: Array<Record<string, unknown>>,
    seeded: boolean
  ): Promise<Pick<DashboardAgentTaskOutput, 'before' | 'dashboard'>> => {
    const writtenId = getLastWrittenDashboardId(steps);
    if (!last.conversationId || (!writtenId && !seeded)) {
      return {};
    }
    const conversation = await agentBuilderClient.getConversation<Conversation>(
      last.conversationId
    );
    const { first: before } = seeded
      ? readDashboardVersions(conversation, SEEDED_DASHBOARD_ID)
      : { first: undefined };
    const { latest: dashboard } = readDashboardVersions(
      conversation,
      writtenId ?? SEEDED_DASHBOARD_ID
    );
    return { before, dashboard };
  };

  const task: ExperimentTask<DashboardDatasetExample, DashboardAgentTaskOutput> = async ({
    input,
    metadata,
  }) => {
    const agentId = getStringMeta(metadata, 'agentId') ?? defaultAgentId;
    const seededDashboard = input?.dashboard;
    const seededResults = input?.esqlResults;
    const screenContext = input?.screenContext;
    const visualizations = input?.visualizations ?? [];
    const attachments = [
      ...visualizations.map(({ id, data }) => ({
        id,
        type: VISUALIZATION_ATTACHMENT_TYPE,
        data: { ...data },
      })),
      ...(seededDashboard
        ? [{ id: SEEDED_DASHBOARD_ID, type: DASHBOARD_ATTACHMENT_TYPE, data: seededDashboard }]
        : []),
      ...(seededResults
        ? [
            {
              id: SEEDED_ESQL_RESULTS_ID,
              type: ESQL_QUERY_RESULTS_ATTACHMENT_TYPE,
              data: { ...seededResults },
            },
          ]
        : []),
      ...(screenContext
        ? [
            {
              id: SCREEN_CONTEXT_ID,
              type: AttachmentType.screenContext,
              data: { ...screenContext },
            },
          ]
        : []),
    ];
    const opening = await agentBuilderClient.converse({
      agentId,
      input: input?.question ?? '',
      ...(attachments.length > 0 ? { attachments } : {}),
    });

    // Enhance examples answer the mode question the way a user would, by picking an option or typing.
    const modeQuestion = findAskUserQuestionPrompt(opening.prompts);
    const modeAnswer = input?.modeAnswer;
    const answer =
      modeQuestion && modeAnswer && opening.conversationId
        ? await agentBuilderClient.converse({
            agentId,
            conversationId: opening.conversationId,
            promptResponses: answerModeQuestion(modeQuestion, modeAnswer),
          })
        : undefined;
    const last = answer ?? opening;
    const steps = answer ? combineTurnSteps(opening.steps, answer.steps) : opening.steps;

    return {
      errors: getToolErrors(steps),
      messages: [{ message: last.message }],
      steps,
      agentTraceId: last.traceId,
      agentTraceIds: [opening.traceId, answer?.traceId].filter(
        (traceId): traceId is string => traceId !== undefined
      ),
      turns: answer ? 2 : 1,
      openingPrompts: opening.prompts,
      openingToolIds: getToolIds({ errors: [], messages: [], steps: opening.steps }),
      ...(await readDashboards(last, steps, seededDashboard !== undefined)),
    };
  };

  const trajectoryEvaluator = createTrajectoryEvaluator({
    extractToolCalls: (output) => getToolIds(output as DashboardAgentTaskOutput),
    goldenPathExtractor: (expected) =>
      (expected as DashboardDatasetExample['output'])?.goldenToolPath ?? [],
    orderWeight: 0.4,
    coverageWeight: 0.6,
  });

  const positiveOnly = (evaluator: DashboardAgentEvaluator) =>
    onlyWhen(
      evaluator,
      expectsDashboard,
      'Routing example; this evaluator scores produced dashboards only.'
    );

  // A scoped enhance must leave the rest of the seeded dashboard, defects
  // included, untouched; Enhance Scope scores it instead.
  const wholeDashboardOnly = (evaluator: DashboardAgentEvaluator) =>
    onlyWhen(
      positiveOnly(evaluator),
      (expected) => expected?.scopedEnhance === undefined,
      'Scoped enhance example; this evaluator scores the whole dashboard.'
    );

  // On a scoped enhance, chart presentation is scored on the named panels only,
  // by `scopedEvaluator` when the dashboard-level rules must not apply.
  const namedPanelsWhenScoped = (
    evaluator: DashboardAgentEvaluator,
    scopedEvaluator: DashboardAgentEvaluator = evaluator
  ): DashboardAgentEvaluator =>
    positiveOnly({
      ...evaluator,
      evaluate: async (params) => {
        const scope = params.expected?.scopedEnhance;
        const { dashboard } = params.output;
        if (!scope || !dashboard) {
          return evaluator.evaluate(params);
        }
        const named = new Set(scope.panelIds);
        const panels = dashboard.panels.flatMap((widget) => {
          if (isSection(widget)) {
            return widget.panels.filter(({ id }) => named.has(id));
          }
          return named.has(widget.id) ? [widget] : [];
        });
        return scopedEvaluator.evaluate({
          ...params,
          output: { ...params.output, dashboard: { ...dashboard, panels } },
        });
      },
    });

  // Quality evaluators score 0..1 and get low-score logging; trace-based
  // evaluators report counts and seconds, so a "low" value means nothing there.
  const qualityEvaluators = [
    dashboardRoutingEvaluator,
    panelConfigReferenceEvaluator,
    wholeDashboardOnly(dashboardStructureEvaluator),
    wholeDashboardOnly(dashboardTimeRangeEvaluator),
    wholeDashboardOnly(dashboardLayoutRulesEvaluator),
    wholeDashboardOnly(dashboardCompositionOrderEvaluator),
    namedPanelsWhenScoped(dashboardTitlesEvaluator, dashboardPanelTitlesEvaluator),
    namedPanelsWhenScoped(dashboardChartStylingEvaluator),
    namedPanelsWhenScoped(dashboardColorFormatEvaluator),
    wholeDashboardOnly(dashboardControlsEvaluator),
    wholeDashboardOnly(dashboardControlSourcingEvaluator),
    wholeDashboardOnly(createControlQueriesEvaluator(esClient)),
    enhanceModeQuestionEvaluator,
    enhanceModeComplianceEvaluator,
    enhanceDefectResolutionEvaluator,
    enhanceNoRegressionEvaluator,
    enhanceScopeEvaluator,
    dashboardLayoutEditEvaluator,
    dashboardPanelEditsEvaluator,
    dashboardReplaceConfirmationEvaluator,
    createUnavailableRequestsEvaluator(esClient),
    createReplyEvaluator(evaluators),
    positiveOnly(trajectoryEvaluator),
  ].map((evaluator) => withLowScoreLogging(evaluator, log));

  return async function evaluateDataset({ dataset: { name, description, examples } }) {
    const dataset = { name, description, examples } satisfies EvaluationDataset;
    await executorClient.runExperiment({ datasets: [dataset], task }, [
      ...qualityEvaluators,
      ...Object.values(evaluators.traceBasedEvaluators).map(useAgentTraceIds),
    ]);
  };
}
