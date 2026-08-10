/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator, Example, TaskOutput } from '@kbn/evals';
import { executeUntilValid } from '@kbn/inference-prompt-utils';
import pRetry from 'p-retry';
import { z } from '@kbn/zod/v4';
import { normalizeEsqlForEquivalence } from './normalize_esql_for_equivalence';

export const ESQL_FUNCTIONAL_EQUIVALENCE_EVALUATOR_NAME = 'ES|QL Functional Equivalence';

// Stamp results with judgeVersion so future rubric changes can be filtered in the golden cluster.
export const ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION = 'v1';

/**
 * Three-point judgement returned by the LLM judge. Mapped to a numeric
 * score for the golden-cluster trend dashboards.
 */
type EquivalenceJudgement = 'equivalent' | 'equivalent_with_caveats' | 'not_equivalent';

const JUDGEMENT_TO_SCORE: Record<EquivalenceJudgement, number> = {
  equivalent: 1,
  equivalent_with_caveats: 0.5,
  not_equivalent: 0,
};

const JUDGEMENT_TO_LABEL: Record<EquivalenceJudgement, string> = {
  equivalent: 'Equivalent ES|QL query',
  equivalent_with_caveats: 'Equivalent with caveats',
  not_equivalent: 'Non-equivalent ES|QL query',
};

const SYSTEM_PROMPT = `You are a senior Elasticsearch analyst evaluating whether a candidate ES|QL query is functionally equivalent to a gold reference ES|QL query.

Two queries are FUNCTIONALLY EQUIVALENT when they would produce the same answer for the same underlying question, even if the syntax differs. Judge on a three-point scale:

- "equivalent" (score 1.0):
  The candidate produces the same logical result as the gold for the question being asked. Any differences are purely surface-level (aliases, output column ordering, equivalent function forms).
- "equivalent_with_caveats" (score 0.5):
  The candidate captures the same intent but has a non-trivial deviation: a slightly different field choice, a different LIMIT, a reasonable but distinct filter threshold, or a partial subset of what the gold computes.
- "not_equivalent" (score 0.0):
  The candidate answers a different question, queries the wrong data source, applies the wrong aggregation, omits a critical filter that changes the result substantially, or is entirely off-topic.

TREAT THE FOLLOWING AS EQUIVALENT (do NOT penalise):
- Column alias differences: \`STATS count = COUNT(*)\` vs \`STATS total = COUNT(*)\`.
- BY grouping aliases: \`BY response.keyword\` vs \`BY \`Response Code\` = response.keyword\` (and \`BY bucket = BUCKET(...)\` vs \`BY BUCKET(...)\`) — the left-hand name is only a label; the grouped field/expression is what matters. Do NOT treat BY alias assignment as invalid or non-equivalent.
- Equivalent function forms: \`DATE_EXTRACT("hour", @timestamp)\` vs \`HOUR(@timestamp)\`; \`SUBSTRING(x, 1, 3)\` vs \`LEFT(x, 3)\`.
- Equivalent comparison forms: \`x >= 5 AND x <= 10\` vs \`x BETWEEN 5 AND 10\`; \`a == "x" AND b == "y"\` vs \`a == "x" | WHERE b == "y"\`.
- Output column ordering or extra cosmetic \`KEEP\`/\`DROP\` clauses that don't change the answer.
- Time-range bind parameters on \`@timestamp\`: presence vs absence of \`WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend\` is cosmetic for visualization evals (dashboard time picker / \`BUCKET\`/\`TBUCKET\` bind params) — do NOT penalise either form. The same applies when comparing that WHERE to a hardcoded literal of the same window.
- Presence vs absence of \`SORT <time bucket> ASC\` on a time-series query — charts order the time axis; do NOT penalise either form.
- Different but compatible bucketing where the granularity is interchangeable for the question (e.g. \`BUCKET(@timestamp, 1h)\` vs \`BUCKET(@timestamp, 50, ?_tstart, ?_tend)\` over the same window when the question is "by hour").
- Broader index patterns that still cover the same logical dataset: \`logs-*\` vs \`logs-endpoint.*\` when the gold uses the broader pattern.
- Different but equivalent ordering of clauses (\`SORT ... | LIMIT n\` vs \`LIMIT n | SORT ...\` when the result set fits in n).

TREAT THE FOLLOWING AS NOT EQUIVALENT (DO penalise):
- Wrong aggregation: gold uses \`AVG\`, candidate uses \`MAX\` (or \`SUM\` vs \`COUNT\`, etc.).
- Wrong index source: gold queries \`logs-*\`, candidate queries \`metrics-*\` or \`.alerts-*\`.
- Missing critical filter: gold filters \`event.action == "failure"\` and the candidate has no equivalent filter at all.
- Different subject: gold groups by \`user.name\`, candidate groups by \`host.name\`.
- Hallucinated or wrong field: candidate references \`source.user\` when the gold (and the question) clearly means \`user.name\`.
- Different question being answered (gold counts authentication failures, candidate lists all processes).

TIE-BREAKER:
When you're genuinely uncertain whether a difference matters, return "equivalent_with_caveats". Reserve "equivalent" for cases where any reasonable analyst would treat the two queries as interchangeable.

CALL THE \`evaluate\` TOOL with your judgement and a 1-2 sentence reason. Do not respond in prose.`;

const USER_PROMPT = `Here is the task:

Gold ES|QL query (reference):
\`\`\`esql
{{{ground_truth}}}
\`\`\`

Candidate ES|QL query (under evaluation):
\`\`\`esql
{{{prediction}}}
\`\`\`

Score the candidate's functional equivalence to the gold.`;

const CalibratedEsqlEquivalencePrompt = createPrompt({
  name: 'agent_builder_visualizations_esql_equivalence',
  description:
    'Three-point calibrated rubric judging ES|QL functional equivalence with explicit allow/deny lists for common transformations.',
  input: z.object({
    ground_truth: z.string(),
    prediction: z.string(),
  }),
})
  .version({
    system: {
      mustache: {
        template: SYSTEM_PROMPT,
      },
    },
    template: {
      mustache: {
        template: USER_PROMPT,
      },
    },
    toolChoice: {
      function: 'evaluate',
    },
    tools: {
      evaluate: {
        description:
          'Score the functional equivalence of the candidate ES|QL query to the gold reference using the three-point rubric.',
        schema: {
          type: 'object',
          properties: {
            equivalence: {
              type: 'string',
              enum: ['equivalent', 'equivalent_with_caveats', 'not_equivalent'],
              description:
                'Three-point equivalence judgement; see system prompt rubric. Use "equivalent_with_caveats" when unsure.',
            },
            reason: {
              type: 'string',
              description:
                'Briefly explain the reasoning (1-2 sentences). Cite the specific clause that drove the judgement.',
            },
          },
          required: ['equivalence', 'reason'],
        },
      },
    },
  } as const)
  .get();

function isEquivalenceJudgement(value: unknown): value is EquivalenceJudgement {
  return (
    typeof value === 'string' &&
    (value === 'equivalent' || value === 'equivalent_with_caveats' || value === 'not_equivalent')
  );
}

/**
 * LLM-judged functional equivalence with a calibrated three-point rubric
 * (equivalent / equivalent_with_caveats / not_equivalent). Results are stamped
 * with `metadata.judgeVersion`.
 */
export function createCalibratedEsqlEquivalenceEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>({
  inferenceClient,
  log,
  predictionExtractor,
  groundTruthExtractor,
}: {
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
  predictionExtractor: (output: TTaskOutput) => string;
  groundTruthExtractor: (expected: TExample['output']) => string;
}): Evaluator<TExample, TTaskOutput> {
  return {
    name: ESQL_FUNCTIONAL_EQUIVALENCE_EVALUATOR_NAME,
    kind: 'LLM',
    evaluate: async ({ output, expected }) => {
      const prediction = predictionExtractor(output);
      const groundTruth = groundTruthExtractor(expected);

      if (!prediction || !groundTruth) {
        return {
          score: 0,
          label: 'No',
          explanation: 'Missing prediction or ground truth query',
          metadata: {
            equivalent: false,
            equivalence: 'not_equivalent',
            judgeVersion: ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION,
            reason: 'Missing prediction or ground truth query for comparison',
          },
        };
      }

      // Strip optional `@timestamp` bind-param WHERE bounds before judging so
      // presence/absence of that conjunct cannot swing the score when the
      // dashboard window is already expressed via BUCKET/TBUCKET params.
      const normalizedPrediction = normalizeEsqlForEquivalence(prediction);
      const normalizedGroundTruth = normalizeEsqlForEquivalence(groundTruth);

      async function runAnalysis(): Promise<{
        equivalence: EquivalenceJudgement;
        reason: string;
      }> {
        let captured: { equivalence: EquivalenceJudgement; reason: string } | undefined;

        await executeUntilValid({
          prompt: CalibratedEsqlEquivalencePrompt,
          inferenceClient,
          input: {
            ground_truth: normalizedGroundTruth,
            prediction: normalizedPrediction,
          },
          finalToolChoice: {
            function: 'evaluate',
          },
          maxRetries: 3,
          toolCallbacks: {
            evaluate: async (toolCall) => {
              const { equivalence, reason } = toolCall.function.arguments as {
                equivalence?: unknown;
                reason?: unknown;
              };
              if (!isEquivalenceJudgement(equivalence) || typeof reason !== 'string') {
                throw new Error(
                  `Invalid evaluate() tool-call arguments: equivalence=${String(
                    equivalence
                  )}, reason=${typeof reason}`
                );
              }
              captured = { equivalence, reason };
              return { response: { equivalence, reason } };
            },
          },
        });

        if (!captured) {
          // executeUntilValid resolved but the callback never ran — bare-text refusal from the judge.
          throw new Error('Judge returned no structured tool call');
        }
        return captured;
      }

      try {
        const { equivalence, reason } = await pRetry(runAnalysis, {
          retries: 3,
          onFailedAttempt: (error) => {
            const isLastAttempt = error.retriesLeft === 0;
            if (isLastAttempt) {
              log.error(
                new Error(
                  `Failed to retrieve calibrated ES|QL equivalence judgement after ${error.attemptNumber} attempts`,
                  { cause: error }
                )
              );
            } else {
              log.warning(
                new Error(
                  `Calibrated ES|QL equivalence judge returned an invalid response on attempt ${error.attemptNumber}; retrying...`,
                  { cause: error }
                )
              );
            }
          },
        });

        const score = JUDGEMENT_TO_SCORE[equivalence];
        return {
          score,
          label: JUDGEMENT_TO_LABEL[equivalence],
          explanation: reason,
          metadata: {
            equivalence,
            equivalent: equivalence === 'equivalent',
            judgeVersion: ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION,
            reason,
          },
        };
      } catch (error) {
        // Judge could not produce a valid structured judgement after all
        // `pRetry` attempts. Scoring conservatively as `not_equivalent` (0)
        // means one problematic example no longer kills the connector's
        // entire suite run — the rest of the dataset still produces signal.
        // `metadata.fallback = 'judge_no_tool_call'` lets dashboards filter
        // these out of the FuncEq distribution so they don't drag the
        // trendline down for reasons unrelated to the candidate's actual
        // correctness.
        log.warning(
          new Error(
            `Calibrated ES|QL FuncEq judge could not produce a structured judgement after retries; scoring as not_equivalent for this example.`,
            { cause: error }
          )
        );
        return {
          score: JUDGEMENT_TO_SCORE.not_equivalent,
          label: 'judge-no-tool-call',
          explanation:
            'Judge did not return a structured tool call after retries; scored conservatively as not_equivalent. ' +
            'See metadata.cause for the underlying error.',
          metadata: {
            equivalence: 'not_equivalent',
            equivalent: false,
            judgeVersion: ESQL_FUNCTIONAL_EQUIVALENCE_JUDGE_VERSION,
            fallback: 'judge_no_tool_call',
            reason: error instanceof Error ? error.message : String(error),
          },
        };
      }
    },
  };
}
