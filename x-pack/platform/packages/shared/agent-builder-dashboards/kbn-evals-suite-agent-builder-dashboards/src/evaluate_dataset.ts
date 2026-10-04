/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { Conversation } from '@kbn/agent-builder-common';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
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
  type Example,
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
  dashboardTitlesEvaluator,
} from './evaluators/dashboard_rule_evaluators';
import type { EnhanceDefectId } from './evaluators/seed_defects';
import { dashboardRoutingEvaluator } from './evaluators/dashboard_routing';
import { dashboardStructureEvaluator } from './evaluators/dashboard_structure';
import {
  enhanceDefectResolutionEvaluator,
  enhanceModeComplianceEvaluator,
  enhanceModeQuestionEvaluator,
  enhanceNoRegressionEvaluator,
} from './evaluators/enhance_evaluators';
import {
  combineTurnSteps,
  findAskUserQuestionPrompt,
  findModeOptionIndex,
  getLastWrittenDashboardId,
  getToolErrors,
  readDashboardVersions,
  type EnhanceMode,
} from './extract_dashboard';
import {
  ESQL_QUERY_RESULTS_ATTACHMENT_TYPE,
  type EsqlQueryResultsData,
} from './fixtures/dissect_logs_results';
import { getToolIds } from './skill_selection_evaluators';

export type { EnhanceMode };

/** Which skill the request should reach: the dashboard skill, the visualization skill, or neither. */
export type DashboardRoute = 'dashboard' | 'visualization' | 'none';

/** What the prompt pins down about the produced dashboard; anything not listed is unchecked. */
export interface DashboardStructureGold {
  panelCount?: { min?: number; max?: number };
  /** Exact number of panels per kind (`metric`, `xy`, `markdown`, …); unlisted kinds are free. */
  panelKinds?: Record<string, number>;
  sectionCount?: number;
  sections?: Array<{ titleIncludesAny: string[]; minPanels?: number }>;
}

export interface EnhanceGold {
  mode: EnhanceMode;
  /** True when the request does not name a mode, so the agent must ask. */
  asksMode: boolean;
  /** Rules the seeded dashboard breaks that this mode is expected to fix. */
  defects: EnhanceDefectId[];
  /**
   * Seed panels content mode may remove besides one copy of a duplicate: ones
   * whose query the mappings cannot satisfy or that measure something unrelated.
   */
  removablePanelIds?: string[];
}

/** Where the dashboard's controls may draw their fields from, and what the prompt asked of them. */
export interface ControlsGold {
  /**
   * True when the prompt asked for controls. The agent then flags them
   * `user_requested`, and accounts for any the server could not add.
   */
  requested: boolean;
  /** Fields mapped on the dashboard's index; a control on any other field is a broken dropdown. */
  mappedFields: readonly string[];
  /** Fields the prompt names a control for, matched with or without `.keyword`. */
  mustInclude?: readonly string[];
  /**
   * Filters the prompt asks for by name. Each needs a stored control on one of
   * its substitutes, or a reply sentence that names it and says it could not be added.
   */
  requestedFilters?: readonly RequestedFilterGold[];
}

export interface RequestedFilterGold {
  name: string;
  /** Words that name the filter in the reply, matched as whole words. */
  terms: readonly string[];
  /** Mapped fields that stand in for it, matched with or without `.keyword`. */
  substitutes: readonly string[];
}

export type DashboardDatasetExample = Example<
  {
    question: string;
    /** Seeded dashboard sent as a by-value attachment with the opening turn. */
    dashboard?: DashboardAttachmentData;
    /** Mode to pick if the agent asks which enhance mode to apply. */
    modeAnswer?: EnhanceMode;
    /** Discover ES|QL results sent as an attachment with the opening turn, as the "AI Agent" action does. */
    esqlResults?: EsqlQueryResultsData;
  },
  {
    route?: DashboardRoute;
    structure?: DashboardStructureGold;
    enhance?: EnhanceGold;
    controls?: ControlsGold;
    goldenToolPath?: string[];
  },
  {
    agentId?: string;
    [key: string]: unknown;
  }
>;

export interface DashboardAgentTaskOutput {
  /** Error results of the agent's tool calls. */
  errors: unknown[];
  messages: Array<{ message: string }>;
  steps?: Array<Record<string, unknown>>;
  agentTraceId?: string;
  /** One agent trace per converse turn, in order; `agentTraceId` is the last. */
  agentTraceIds?: string[];
  traceId?: string;
  /** Number of converse turns the task ran (2 when it answered the mode question). */
  turns?: number;
  /** Structured prompts the agent raised on the opening turn. */
  openingPrompts?: unknown[];
  /** Tool ids the agent called on the opening turn. */
  openingToolIds?: string[];
  /** The seeded dashboard as the conversation stored it. */
  before?: DashboardAttachmentData;
  /** The dashboard after the last turn, read from the conversation. */
  dashboard?: DashboardAttachmentData;
}

export type DashboardAgentEvaluator = Evaluator<DashboardDatasetExample, DashboardAgentTaskOutput>;

export type EvaluateDataset = ({
  dataset,
}: {
  dataset: {
    name: string;
    description: string;
    examples: DashboardDatasetExample[];
  };
}) => Promise<void>;

/** Id of the seeded attachment, so the task can find it on the conversation afterwards. */
export const SEEDED_DASHBOARD_ID = 'eval-seeded-dashboard';
/** Id Discover gives the ES|QL results attachment it sends with the "AI Agent" action. */
export const SEEDED_ESQL_RESULTS_ID = 'esql-query-results';

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

/** Answers an `ask_user_question` prompt with the option for `mode`, or free text if none fits. */
const answerModeQuestion = (
  prompt: NonNullable<ReturnType<typeof findAskUserQuestionPrompt>>,
  mode: EnhanceMode
): Record<string, unknown> => ({
  [prompt.id]: {
    answers: prompt.questions.map(({ options }, index) => {
      if (index > 0) {
        return { skipped: true };
      }
      const choice = findModeOptionIndex(options, mode);
      return choice === -1
        ? { custom: mode === 'appearance' ? 'Appearance only' : 'Appearance and content' }
        : { choice: [choice] };
    }),
  },
});

const expectsDashboard = (expected: DashboardDatasetExample['output']): boolean =>
  expected?.route === 'dashboard' || expected?.enhance !== undefined;

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
    const attachments = [
      ...(seededDashboard
        ? [{ id: SEEDED_DASHBOARD_ID, type: DASHBOARD_ATTACHMENT_TYPE, data: seededDashboard }]
        : []),
      ...(seededResults
        ? [
            {
              id: SEEDED_ESQL_RESULTS_ID,
              type: ESQL_QUERY_RESULTS_ATTACHMENT_TYPE,
              data: seededResults,
            },
          ]
        : []),
    ];
    const opening = await agentBuilderClient.converse({
      agentId,
      input: input?.question ?? '',
      ...(attachments.length > 0 ? { attachments } : {}),
    });

    // Enhance examples answer the mode question the way a user would, by picking an option.
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

  // Quality evaluators score 0..1 and get low-score logging; trace-based
  // evaluators report counts and seconds, so a "low" value means nothing there.
  const qualityEvaluators = [
    dashboardRoutingEvaluator,
    positiveOnly(dashboardStructureEvaluator),
    positiveOnly(dashboardLayoutRulesEvaluator),
    positiveOnly(dashboardCompositionOrderEvaluator),
    positiveOnly(dashboardTitlesEvaluator),
    positiveOnly(dashboardChartStylingEvaluator),
    positiveOnly(dashboardColorFormatEvaluator),
    positiveOnly(dashboardControlsEvaluator),
    positiveOnly(dashboardControlSourcingEvaluator),
    positiveOnly(createControlQueriesEvaluator(esClient)),
    enhanceModeQuestionEvaluator,
    enhanceModeComplianceEvaluator,
    enhanceDefectResolutionEvaluator,
    enhanceNoRegressionEvaluator,
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
