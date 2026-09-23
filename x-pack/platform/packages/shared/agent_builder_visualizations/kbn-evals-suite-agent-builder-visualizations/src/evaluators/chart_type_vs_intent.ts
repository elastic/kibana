/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import { createPrompt } from '@kbn/inference-common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import type { ToolingLog } from '@kbn/tooling-log';
import { z } from '@kbn/zod/v4';
import type { ExtractedVisualization } from '../extract_visualization';
import { skippedResult } from '../evaluator_utils';
import type { GoldChartForm } from './gold_visualization_config';

export const CHART_TYPE_VS_INTENT_EVALUATOR_NAME = 'Chart Type vs Intent';

// Stamp results with judgeVersion so future rubric changes can be filtered in the golden cluster.
export const CHART_TYPE_VS_INTENT_JUDGE_VERSION = 'chart-form-judge-v1';

/** Chart form the agent produced: Lens chart type, xy series types, Vega mark. */
export interface ActualChartForm {
  chartType?: string;
  renderer?: 'lens' | 'vega';
  layerTypes: string[];
  mark?: string;
}

// A type alias (not an interface) so it satisfies the tool callback's Record<string, unknown> response.
export type ChartIntentVerdict = {
  verdict: 'satisfies' | 'does_not_satisfy';
  reason: string;
};

export type ChartIntentJudge = (input: {
  question: string;
  gold: GoldChartForm;
  actual: ActualChartForm;
}) => Promise<ChartIntentVerdict>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const SYSTEM_PROMPT = `You judge whether the FORM of a generated chart satisfies a user's visualization request.

You receive the user's request, the gold chart form the dataset author considers correct, and the chart form the agent produced. Chart form means:
- the Lens chart type (xy, metric, gauge, pie, treemap, tag_cloud, data_table, heatmap, ...)
- for xy charts, the series type of each layer (bar, bar_horizontal, bar_stacked, line, area, ...)
- for Vega-Lite, the mark (point, circle, bar, line, ...)

Return "satisfies" when a reasonable user who wrote this request would accept the produced chart as the kind of chart they asked for. The gold describes intent, not an exact target:
- Variants within one family satisfy a generic request: "bar chart" is satisfied by bar, bar_horizontal, bar_stacked or bar_percentage_stacked; a scatter is satisfied by point or circle marks; a gold list of alternatives means any of them is fine.
- Casing and naming differences never matter.

Return "does_not_satisfy" when:
- the produced chart is a different kind of chart (pie instead of bar, metric instead of a line over time, table instead of a chart, gauge instead of metric when the user asked for a gauge)
- the produced chart contradicts something the request states explicitly (the user asked for horizontal bars and got vertical ones, asked for a line and got an area)
- no chart form was produced at all

Ignore column names, titles, colors, legends, and the ES|QL query; other evaluators score those.

CALL THE \`evaluate\` TOOL with your verdict and a one-sentence reason. Do not respond in prose.`;

const USER_PROMPT = `User request:
{{{question}}}

Gold chart form (reference for intent):
\`\`\`json
{{{gold}}}
\`\`\`

Produced chart form (under evaluation):
\`\`\`json
{{{actual}}}
\`\`\`

Does the produced chart form satisfy the request?`;

const ChartIntentPrompt = createPrompt({
  name: 'chart_type_vs_intent',
  description:
    'Judges whether the produced chart type / series type / Vega mark satisfies the user request, using the gold chart form as a reference for intent.',
  input: z.object({
    question: z.string(),
    gold: z.string(),
    actual: z.string(),
  }),
})
  .version({
    system: { mustache: { template: SYSTEM_PROMPT } },
    template: { mustache: { template: USER_PROMPT } },
    toolChoice: { function: 'evaluate' },
    tools: {
      evaluate: {
        description: 'Record whether the produced chart form satisfies the user request.',
        schema: {
          type: 'object',
          properties: {
            verdict: {
              type: 'string',
              enum: ['satisfies', 'does_not_satisfy'],
              description:
                'Whether the produced chart form is the kind of chart the user asked for.',
            },
            reason: {
              type: 'string',
              description: 'One sentence naming the decisive difference or similarity.',
            },
          },
          required: ['verdict', 'reason'],
        },
      },
    },
  } as const)
  .get();

const isVerdict = (value: unknown): value is ChartIntentVerdict['verdict'] =>
  value === 'satisfies' || value === 'does_not_satisfy';

/** LLM judge for chart form. Throws when the model returns no structured verdict after retries. */
export function createChartIntentJudge({
  inferenceClient,
  log,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): ChartIntentJudge {
  return async ({ question, gold, actual }) => {
    let captured: ChartIntentVerdict | undefined;

    await executeUntilValid({
      prompt: ChartIntentPrompt,
      inferenceClient,
      input: {
        question,
        gold: JSON.stringify(gold, null, 2),
        actual: JSON.stringify(actual, null, 2),
      },
      finalToolChoice: { function: 'evaluate' },
      maxRetries: 3,
      toolCallbacks: {
        evaluate: async (toolCall) => {
          const { verdict, reason } = toolCall.function.arguments as {
            verdict?: unknown;
            reason?: unknown;
          };
          if (!isVerdict(verdict) || typeof reason !== 'string') {
            throw new Error(
              `Invalid evaluate() tool-call arguments: verdict=${String(
                verdict
              )}, reason=${typeof reason}`
            );
          }
          captured = { verdict, reason };
          return { response: captured };
        },
      },
    });

    if (!captured) {
      log.warning('Chart form judge returned no structured tool call');
      throw new Error('Chart form judge returned no structured tool call');
    }
    return captured;
  };
}

/** Reads chart type, xy layer series types, and the Vega mark out of a generated visualization. */
export function describeActualChartForm(visualization: ExtractedVisualization): ActualChartForm {
  const config = visualization.visualization ?? {};
  const layers = Array.isArray(config.layers) ? config.layers : [];
  const layerTypes = layers.flatMap((layer) =>
    isRecord(layer) && typeof layer.type === 'string' ? [layer.type] : []
  );

  return {
    chartType: visualization.chartType,
    renderer: visualization.renderer,
    layerTypes,
    mark: readVegaMark(config.spec),
  };
}

function readVegaMark(spec: unknown): string | undefined {
  if (typeof spec !== 'string') {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(spec);
    if (!isRecord(parsed)) {
      return undefined;
    }
    if (typeof parsed.mark === 'string') {
      return parsed.mark;
    }
    if (isRecord(parsed.mark) && typeof parsed.mark.type === 'string') {
      return parsed.mark.type;
    }
  } catch {
    // Not JSON; no mark to report.
  }
  return undefined;
}

/**
 * LLM evaluator: asks a judge whether each produced chart's form (chart type,
 * xy series types, Vega mark) satisfies the user request, using the gold chart
 * form as the reference for intent. Skips when the gold declares no chart form
 * and abstains (`score: null`) when the judge returns no verdict.
 */
export function createChartTypeVsIntentEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  visualizationExtractor: (output: TTaskOutput) => ExtractedVisualization[];
  questionExtractor: (input: TExample['input']) => string;
  expectedChartFormExtractor: (expected: TExample['output']) => GoldChartForm | undefined;
  judge: ChartIntentJudge;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    visualizationExtractor,
    questionExtractor,
    expectedChartFormExtractor,
    judge,
    name = CHART_TYPE_VS_INTENT_EVALUATOR_NAME,
  } = config;

  return {
    name,
    kind: 'LLM',
    direction: 'maximize',
    evaluate: async ({ input, output, expected }): Promise<EvaluationResult> => {
      const gold = expectedChartFormExtractor(expected);
      if (!gold) {
        return skippedResult('No expected chart form declared for this example.');
      }

      let visualizations: ExtractedVisualization[];
      try {
        visualizations = visualizationExtractor(output);
      } catch (err) {
        return {
          score: 0,
          label: 'error',
          explanation: `Visualization extractor threw: ${(err as Error).message}`,
        };
      }

      if (visualizations.length === 0) {
        return {
          score: 0,
          label: 'no-visualization',
          explanation: 'No visualization produced to compare chart form against intent.',
          metadata: { gold, judgeVersion: CHART_TYPE_VS_INTENT_JUDGE_VERSION },
        };
      }

      const question = questionExtractor(input);
      const details = await Promise.all(
        visualizations.map(async (visualization, index) => {
          const actual = describeActualChartForm(visualization);
          try {
            const { verdict, reason } = await judge({ question, gold, actual });
            return {
              index,
              actual,
              satisfies: verdict === 'satisfies',
              reason,
              fallback: undefined as 'judge_no_tool_call' | undefined,
            };
          } catch (error) {
            return {
              index,
              actual,
              satisfies: false,
              reason: error instanceof Error ? error.message : String(error),
              fallback: 'judge_no_tool_call' as const,
            };
          }
        })
      );

      // A judge that returns no verdict is an infrastructure failure, not an agent
      // failure: abstain like the other evaluators do for gold-side problems.
      const judgeFailures = details.filter((detail) => detail.fallback !== undefined);
      if (judgeFailures.length > 0) {
        return {
          score: null,
          label: 'judge-failure',
          explanation: `Chart form judge failed on ${judgeFailures.length}/${
            details.length
          } visualization(s): ${judgeFailures.map((detail) => detail.reason).join('; ')}`,
          metadata: {
            gold,
            totalVisualizations: details.length,
            visualizations: details,
            judgeVersion: CHART_TYPE_VS_INTENT_JUDGE_VERSION,
          },
        };
      }

      const satisfiedCount = details.filter((detail) => detail.satisfies).length;
      const score = satisfiedCount / details.length;

      return {
        score,
        label: score === 1 ? 'match' : score === 0 ? 'mismatch' : 'partial',
        explanation: details.map((detail) => detail.reason).join(' '),
        metadata: {
          gold,
          satisfiedCount,
          totalVisualizations: details.length,
          visualizations: details,
          judgeVersion: CHART_TYPE_VS_INTENT_JUDGE_VERSION,
        },
      };
    },
  };
}
