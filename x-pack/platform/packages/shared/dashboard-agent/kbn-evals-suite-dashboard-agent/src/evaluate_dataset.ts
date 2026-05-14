/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type Example,
  type EvaluationDataset,
  type EvaluationCriterion,
  selectEvaluators,
  withEvaluatorSpan,
  createSpanLatencyEvaluator,
  getToolCallSteps,
  getStringMeta,
  type ExperimentTask,
  type TaskOutput,
} from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AgentBuilderEvaluationChatClient } from './chat_client';
import {
  getLatestDashboard,
  getAllPanels,
  hasOverlappingPanels,
  extractDashboardResults,
} from './dashboard_extractors';

const MANAGE_DASHBOARD_TOOL_ID = 'platform.dashboard.manage_dashboard';
const CREATE_VISUALIZATION_TOOL_ID = 'platform.core.create_visualization';

export interface DashboardDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    expectedTitle?: string;
    expectedDescription?: string;
    expectedMinPanels?: number;
    expectedSectionCount?: number;
    expectsMarkdown?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export type EvaluateDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: DashboardDatasetExample[];
  };
}) => Promise<void>;

const DASHBOARD_QUALITY_CRITERIA: EvaluationCriterion[] = [
  {
    id: 'title_quality',
    text: 'The dashboard title clearly describes what the dashboard monitors or tracks.',
  },
  {
    id: 'description_quality',
    text: 'The dashboard description provides useful context about its purpose.',
  },
  {
    id: 'layout_organization',
    text: 'The panel layout is logically organized (related panels grouped, reasonable sizing).',
  },
  {
    id: 'content_relevance',
    text: "The dashboard content (panels, visualizations) matches the user's original request.",
  },
  {
    id: 'markdown_accuracy',
    text: 'If a markdown summary is present, it accurately describes the dashboard contents.',
  },
];

function configureExperiment({
  evaluators,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  chatClient: AgentBuilderEvaluationChatClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): {
  task: ExperimentTask<DashboardDatasetExample, TaskOutput>;
  evaluators: ReturnType<typeof selectEvaluators>;
} {
  const task: ExperimentTask<DashboardDatasetExample, TaskOutput> = async ({ input, metadata }) => {
    const agentId = getStringMeta(metadata, 'agentId');
    const response = await chatClient.converse({
      messages: [{ message: input.question }],
      ...(agentId ? { agentId } : {}),
    });

    // Debug: log tool calls to understand what the agent is doing
    const steps = response.steps ?? [];
    const toolCallSteps = steps.filter((s: any) => s?.type === 'tool_call');
    log.info(
      `[dashboard-eval] Tool calls for "${input.question.slice(0, 60)}...": ${JSON.stringify(
        toolCallSteps.map((s: any) => ({ tool_id: s.tool_id, type: s.type }))
      )}`
    );

    return {
      errors: response.errors,
      messages: response.messages,
      steps: response.steps,
      traceId: response.traceId,
    };
  };

  const selectedEvaluators = selectEvaluators([
    {
      name: 'CorrectToolUsage',
      kind: 'CODE' as const,
      evaluate: async ({ output }) => {
        const toolCalls = getToolCallSteps(output as TaskOutput);
        const usedToolIds = toolCalls.map((t) => t.tool_id).filter(Boolean);
        const hasVisualizationCall = usedToolIds.includes(CREATE_VISUALIZATION_TOOL_ID);
        const hasDashboardCall = usedToolIds.includes(MANAGE_DASHBOARD_TOOL_ID);

        return {
          score: hasVisualizationCall && hasDashboardCall ? 1 : 0,
          metadata: {
            hasVisualizationCall,
            hasDashboardCall,
            usedToolIds,
          },
        };
      },
    },
    {
      name: 'DashboardStructure',
      kind: 'CODE' as const,
      evaluate: async ({ output }) => {
        const dashboard = getLatestDashboard(output as TaskOutput);
        if (!dashboard) {
          return { score: 0, metadata: { reason: 'No dashboard result found' } };
        }
        const { content } = dashboard.dashboardAttachment;
        const allPanels = getAllPanels(content);
        const hasTitle = content.title.length > 0;
        const hasDescription = content.description.length > 0;
        const hasPanels = allPanels.length > 0;

        return {
          score: hasTitle && hasDescription && hasPanels ? 1 : 0,
          metadata: {
            title: content.title,
            description: content.description,
            panelCount: allPanels.length,
            sectionCount: content.sections?.length ?? 0,
          },
        };
      },
    },
    {
      name: 'ValidGridPositions',
      kind: 'CODE' as const,
      evaluate: async ({ output }) => {
        const dashboard = getLatestDashboard(output as TaskOutput);
        if (!dashboard) {
          return { score: 0, metadata: { reason: 'No dashboard result found' } };
        }
        const allPanels = getAllPanels(dashboard.dashboardAttachment.content);
        const invalidPanels: Array<{ panelId: string; reason: string }> = [];

        for (const panel of allPanels) {
          const { x, y, w, h } = panel.grid;
          if (x < 0 || y < 0) {
            invalidPanels.push({ panelId: panel.panelId, reason: 'Negative position' });
          } else if (w < 1 || h < 1) {
            invalidPanels.push({ panelId: panel.panelId, reason: 'Zero or negative dimensions' });
          } else if (x + w > 48) {
            invalidPanels.push({
              panelId: panel.panelId,
              reason: `Exceeds 48-column grid: x(${x}) + w(${w}) = ${x + w}`,
            });
          }
        }

        return {
          score: invalidPanels.length === 0 ? 1 : 0,
          metadata: { totalPanels: allPanels.length, invalidPanels },
        };
      },
    },
    {
      name: 'NoPanelOverlaps',
      kind: 'CODE' as const,
      evaluate: async ({ output }) => {
        const dashboard = getLatestDashboard(output as TaskOutput);
        if (!dashboard) {
          return { score: 0, metadata: { reason: 'No dashboard result found' } };
        }
        const { content } = dashboard.dashboardAttachment;

        // Check top-level panels
        const topLevelOverlap = hasOverlappingPanels(content.panels);
        // Check each section's panels
        const sectionOverlaps = (content.sections ?? []).map((section) => ({
          sectionId: section.sectionId,
          hasOverlap: hasOverlappingPanels(section.panels),
        }));

        const anyOverlap = topLevelOverlap || sectionOverlaps.some((s) => s.hasOverlap);

        return {
          score: anyOverlap ? 0 : 1,
          metadata: { topLevelOverlap, sectionOverlaps },
        };
      },
    },
    {
      name: 'PanelCount',
      kind: 'CODE' as const,
      evaluate: async ({ output, expected }) => {
        const expectedOutput = expected as DashboardDatasetExample['output'] | undefined;
        const expectedMinPanels = expectedOutput?.expectedMinPanels;
        if (expectedMinPanels === undefined) {
          return { score: 1 };
        }

        const dashboard = getLatestDashboard(output as TaskOutput);
        if (!dashboard) {
          return { score: 0, metadata: { reason: 'No dashboard result found' } };
        }
        const allPanels = getAllPanels(dashboard.dashboardAttachment.content);

        return {
          score: allPanels.length >= expectedMinPanels ? 1 : 0,
          metadata: { actualPanelCount: allPanels.length, expectedMinPanels },
        };
      },
    },
    {
      name: 'DashboardQuality',
      kind: 'LLM' as const,
      evaluate: async ({ input, output, expected, metadata }) => {
        return withEvaluatorSpan('DashboardQuality', {}, () => {
          const dashboardResults = extractDashboardResults(output as TaskOutput);
          const dashboardSummary = dashboardResults.map((r) => {
            const { content } = r.dashboardAttachment;
            return {
              title: content.title,
              description: content.description,
              panelCount: getAllPanels(content).length,
              sections: content.sections?.map((s) => ({
                title: s.title,
                panelCount: s.panels.length,
              })),
            };
          });

          return evaluators.criteria(DASHBOARD_QUALITY_CRITERIA).evaluate({
            input,
            expected,
            output: {
              ...(output as Record<string, unknown>),
              dashboardSummary,
            },
            metadata,
          });
        });
      },
    },
    ...Object.values({
      ...evaluators.traceBasedEvaluators,
      latency: createSpanLatencyEvaluator({
        traceEsClient,
        log,
        spanName: 'Converse',
      }),
    }),
  ]);

  return { task, evaluators: selectedEvaluators };
}

export function createEvaluateDataset({
  evaluators,
  executorClient,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: AgentBuilderEvaluationChatClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateDataset {
  return async function evaluateDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: DashboardDatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    const { task, evaluators: selectedEvaluators } = configureExperiment({
      evaluators,
      chatClient,
      traceEsClient,
      log,
    });

    await executorClient.runExperiment(
      {
        dataset,
        task,
      },
      selectedEvaluators
    );
  };
}
