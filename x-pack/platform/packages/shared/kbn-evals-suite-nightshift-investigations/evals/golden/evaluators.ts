/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { BoundInferenceClient, ToolSchema } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';
import type { GoldenEvaluator, GoldenTaskOutput, TrajectoryStep } from './types';
import {
  GOAL_SYSTEM_TEMPLATE,
  GOAL_USER_TEMPLATE,
  INVESTIGATION_RUBRIC,
  GENERAL_RUBRIC,
  goalSchema,
  SHARED_SYSTEM_TEMPLATE,
  SHARED_USER_TEMPLATE,
  sharedSchema,
  FOCUS_SYSTEM_TEMPLATE,
  FOCUS_USER_TEMPLATE,
  focusSchema,
  EVIDENCE_SYSTEM_TEMPLATE,
  EVIDENCE_USER_TEMPLATE,
  evidenceSchema,
} from './prompts';

const judgeToolSchema = (schema: z.ZodObject): ToolSchema => {
  const { properties, required } = z.toJSONSchema(schema);
  // The inference route accepts JSON Schema properties, including nullable unions, but its TS type is narrower.
  return { type: 'object', properties, required } as ToolSchema;
};

const round = (value: number, digits = 3): number => {
  if (!Number.isFinite(value)) return value;
  // Python rounds the exact binary float, not a float first multiplied by 10 ** digits.
  const binary = new DataView(new ArrayBuffer(8));
  binary.setFloat64(0, value);
  const bits = binary.getBigUint64(0);
  const exponentBits = Number((bits / 2n ** 52n) % 2048n);
  const significand = (bits % 2n ** 52n) + (exponentBits ? 2n ** 52n : 0n);
  const exponent = (exponentBits || 1) - 1023 - 52;
  const numerator = significand * 10n ** BigInt(digits) * 2n ** BigInt(Math.max(0, exponent));
  const denominator = 2n ** BigInt(Math.max(0, -exponent));
  const quotient = numerator / denominator;
  const remainder = (numerator % denominator) * 2n;
  const increment = remainder > denominator || (remainder === denominator && quotient % 2n === 1n);
  const rounded = Number(quotient + (increment ? 1n : 0n)) / 10 ** digits;
  return bits / 2n ** 63n ? -rounded : rounded;
};
const format = (value: number, digits: number): string => round(value, digits).toFixed(digits);
const pythonBool = (value: boolean): string => (value ? 'True' : 'False');
const falsePositivePattern =
  /\b(false[- ]positive|false[- ]alarm|spurious|no[- ]real[- ]issue|5[- ]min[- ]blip|short[- ]blip|transient[- ]blip|auto[- ]resolv|already[- ]recover|normal[- ]levels|within[- ]normal)\b/i;

export const codeEvaluators: GoldenEvaluator[] = [
  {
    name: 'latency_ok',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => ({
      score: Number(output.latency_seconds <= output.max_latency_seconds),
      explanation: `latency=${format(output.latency_seconds, 3)}s budget=${format(
        output.max_latency_seconds,
        3
      )}s`,
    }),
  },
  ...(
    [
      ['latency_seconds', 'latency_seconds'],
      ['latency_budget_seconds', 'max_latency_seconds'],
      ['tool_calls_total', 'total_tool_calls'],
      ['tool_calls_failed', 'failed_tool_calls'],
    ] as const
  ).map(
    ([name, field]): GoldenEvaluator => ({
      name,
      kind: 'CODE',
      direction: name === 'latency_budget_seconds' ? 'neutral' : 'minimize',
      evaluate: async ({ output }) => ({ score: output[field] }),
    })
  ),
  {
    name: 'cost_usd',
    kind: 'CODE',
    direction: 'minimize',
    evaluate: async () => ({
      score: null,
      explanation: 'Kibana does not provide a dollar-cost rollup; unavailable, not zero.',
    }),
  },
  {
    name: 'rca_entity_recall',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      const reference = expected.reference_answer ?? '';
      const answer = output.final_answer.toLowerCase();
      if (!reference || !answer) return { score: null };
      const entities = new Set(
        [
          ...(reference.match(/\bpev-\d+\b/gi) ?? []),
          ...(reference.match(/\b[a-z][a-z0-9]{2,}(?:[_-][a-z0-9]+){1,}\b/gi) ?? []).filter(
            (token) => token.length >= 6
          ),
        ].map((entity) => entity.toLowerCase())
      );
      const missed = [...entities].filter((entity) => !answer.includes(entity)).sort();
      const found = entities.size - missed.length;
      return {
        score: round(entities.size ? found / entities.size : 1),
        explanation: `entities_in_ref=${entities.size} found=${found} missed=[${missed
          .slice(0, 5)
          .map((entity) => `'${entity}'`)
          .join(', ')}]`,
      };
    },
  },
  {
    name: 'rca_false_positive',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      if (!falsePositivePattern.test(expected.reference_answer ?? '')) return { score: null };
      const isFalsePositive = falsePositivePattern.test(output.final_answer);
      return {
        score: Number(isFalsePositive),
        explanation: `reference=false_positive agent=${
          isFalsePositive ? 'false_positive' : 'real_issue'
        }`,
      };
    },
  },
  {
    name: 'rca_investigation_efficiency',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const { total_tool_calls: total, failed_tool_calls: failed, trajectory } = output;
      const commands = trajectory
        .filter(({ step_type }) => step_type === 'tool_call')
        .map(({ tool_args }) => String(tool_args?.command ?? '').slice(0, 200))
        .filter(Boolean);
      const unique = new Set(commands).size;
      const redundant = commands.length - unique;
      const countScore =
        total <= 35
          ? 1
          : total <= 50
          ? 1 - (total - 35) / 30
          : Math.max(0, 0.5 - (total - 50) / 50);
      const failScore = total > 0 ? Math.max(0, 1 - (failed / total) * 5) : 1;
      const redundancyScore = commands.length
        ? Math.max(0, 1 - (redundant / commands.length) * 3)
        : 1;
      return {
        score: round((countScore + failScore + redundancyScore) / 3),
        explanation: `tools=${total} failed=${failed} unique_cmds=${unique} redundant=${redundant} | count=${format(
          countScore,
          2
        )} fail=${format(failScore, 2)} redundancy=${format(redundancyScore, 2)}`,
      };
    },
  },
];

const confidencePattern =
  /(?:~?\s*(\d{1,3})\s*%\s*(?:confidence|probability|likely|chance))|(?:(?:confidence|probability|likely|chance)[:\s~]?\s*(\d{1,3})\s*%)/gi;
const maxConfidence = (answer: string): number | null => {
  const percentages = [...answer.matchAll(confidencePattern)].map(
    (match) => Number(match[1] || match[2]) / 100
  );
  const decimals = [...answer.matchAll(/(?:probability|confidence)[:\s]*([01]\.\d+)/gi)].map(
    (match) => Number(match[1])
  );
  const values = [...percentages, ...decimals];
  return values.length ? Math.max(...values) : null;
};
const leakagePattern =
  /\b(incident\s+resolved|post[- ]incident|mitigation\s+completed|rollback\s+completed|rollback\s+fixed|resolution|resolved\s+at|pev[- ]\d+.*(?:resolved|mitigated|fixed))\b/i;
// The pinned Python grader reads content[:400]; its separate tool_output cap is 2,000.
const trajectoryText = (output: GoldenTaskOutput): string =>
  output.trajectory
    .map((step) => `[${step.step_type}] ${step.tool_name || ''}: ${step.content.slice(0, 400)}`)
    .join('\n');

const createSemanticEvaluators = (
  inferenceClient: Pick<BoundInferenceClient, 'output'>
): GoldenEvaluator[] => {
  type SharedScores = z.infer<typeof sharedSchema>;
  const cache = new Map<string, Promise<SharedScores | null>>();
  const getScores = (output: GoldenTaskOutput, reference: string): Promise<SharedScores | null> => {
    // The native executor clones task output for each evaluator. Cache by execution identity.
    const key = output.investigation_id ?? output.traceId ?? output.test_id;
    const cached = cache.get(key);
    if (cached) return cached;
    const result =
      !reference || !output.final_answer
        ? Promise.resolve(null)
        : inferenceClient
            .output({
              id: 'golden_investigation',
              schema: judgeToolSchema(sharedSchema),
              system: renderPrompt(SHARED_SYSTEM_TEMPLATE, { reference, query: output.query }),
              input: renderPrompt(SHARED_USER_TEMPLATE, {
                'trajectory_text[:6000]': trajectoryText(output).slice(0, 6000),
                'final_answer[:4000]': output.final_answer.slice(0, 4000),
              }),
            })
            .then((response) => sharedSchema.parse(response.output))
            .catch(() => null);
    cache.set(key, result);
    return result;
  };
  return (
    [
      'rca_mechanism_class',
      'rca_timeline_ok',
      'rca_signal_coverage',
      'rca_cause_completeness',
      'rca_confidence_ok',
      'rca_anti_leakage',
    ] as const
  ).map(
    (name): GoldenEvaluator => ({
      name,
      kind: 'LLM',
      direction: 'maximize',
      getVersion: () => promptVersion(SHARED_SYSTEM_TEMPLATE, SHARED_USER_TEMPLATE),
      evaluate: async ({ output, expected }) => {
        const confidence = maxConfidence(output.final_answer);
        if (name === 'rca_confidence_ok' && confidence === null)
          return { score: null, explanation: 'no_stated_confidence' };
        const answerLeakage = leakagePattern.test(output.final_answer);
        const toolLeakage = output.trajectory.some(
          (step) => step.step_type === 'tool_result' && leakagePattern.test(step.tool_output ?? '')
        );
        // Preserve the reference's rule-first gate even when another grader populated the cache.
        if (name === 'rca_anti_leakage' && !answerLeakage && !toolLeakage)
          return { score: 1, explanation: 'no_leakage_detected' };
        const scores = await getScores(output, expected.reference_answer ?? '');
        if (name === 'rca_anti_leakage')
          return {
            // Python treats judge failure as leakage for answer matches, but clean for tool-only matches.
            score: Number(!(scores?.used_post_incident_evidence ?? answerLeakage)),
            explanation:
              scores?.anti_leakage_reasoning ??
              (answerLeakage ? 'post-incident text in final answer' : 'checked trajectory'),
          };
        if (!scores) return { score: null };
        switch (name) {
          case 'rca_mechanism_class':
            return {
              score: Number(scores.mechanism_class_match),
              explanation: `reference=${scores.reference_mechanism_class} agent=${scores.agent_mechanism_class}`,
            };
          case 'rca_timeline_ok':
            return {
              score: Number(!scores.timeline_contradiction_found),
              explanation: scores.timeline_reasoning,
            };
          case 'rca_signal_coverage':
            return {
              score: round(scores.signal_coverage_score),
              explanation: scores.signal_coverage_reasoning,
            };
          case 'rca_cause_completeness':
            return {
              score: round(scores.cause_completeness_score),
              explanation: `is_combined=${pythonBool(scores.is_combined_cause)}`,
            };
          case 'rca_confidence_ok':
            return {
              score: Number(!scores.confidence_overconfident),
              explanation: `stated_confidence=${round(
                (confidence ?? 0) * 100,
                0
              )}% overconfident=${pythonBool(scores.confidence_overconfident)}`,
            };
        }
      },
    })
  );
};

const renderPrompt = (template: string, values: Record<string, string>): string =>
  template.replace(/\{([^}]+)\}/g, (match, key: string) => values[key] ?? match);
const promptVersion = (...prompts: string[]): string =>
  createHash('sha256').update(prompts.join('\n')).digest('hex');

const formatTrajectory = (trajectory: TrajectoryStep[]): string =>
  trajectory
    .flatMap((step, index) => {
      if (step.step_type === 'tool_call')
        return [
          `[${index + 1}] TOOL CALL: ${step.tool_name}`,
          ...(step.tool_args && Object.keys(step.tool_args).length
            ? [
                `    Args: ${JSON.stringify(step.tool_args)
                  .replace(
                    /("(?:\\.|[^"\\])*")|([:,])/g,
                    (match, string: string, separator: string) => string ?? `${separator} `
                  )
                  .slice(0, 500)}`,
              ]
            : []),
        ];
      if (step.step_type === 'tool_result')
        return [
          `[${index + 1}] TOOL RESULT (${step.success ? 'OK' : 'ERROR'}): ${step.tool_name}`,
          `    Output: ${(step.tool_output || 'No output').slice(0, 1000)}`,
        ];
      if (step.step_type === 'response')
        return [`[${index + 1}] AGENT RESPONSE: ${step.content.slice(0, 500)}`];
      return [];
    })
    .join('\n') || 'No trajectory available.';

/** Creates the golden graders with one evaluation connector shared by their structured calls. */
export const createGoldenEvaluators = (
  inferenceClient: Pick<BoundInferenceClient, 'output'>
): GoldenEvaluator[] => [
  ...codeEvaluators,
  {
    name: 'goal_pass',
    kind: 'LLM',
    direction: 'maximize',
    getVersion: () =>
      promptVersion(GOAL_SYSTEM_TEMPLATE, GOAL_USER_TEMPLATE, INVESTIGATION_RUBRIC, GENERAL_RUBRIC),
    evaluate: async ({ output, expected, metadata }) => {
      if (output.execution_error)
        return {
          score: 0,
          explanation: `Execution error before goal evaluation: ${output.execution_error}`,
        };
      const category = metadata.category || 'uncategorized';
      const reference = (expected.reference_answer || expected.answer || '').trim();
      const rubric =
        category.trim().toLowerCase() === 'investigate' ||
        /^debug this alert(?:\b|\s|:|$)/.test(output.query.trim().toLowerCase())
          ? INVESTIGATION_RUBRIC
          : GENERAL_RUBRIC;
      try {
        const result = await inferenceClient.output({
          id: 'golden_goal',
          schema: judgeToolSchema(goalSchema),
          system: renderPrompt(GOAL_SYSTEM_TEMPLATE, {
            query: output.query,
            test_category: category,
            goal_reference_answer: reference,
            rubric,
          }),
          input: renderPrompt(GOAL_USER_TEMPLATE, {
            formatted_trajectory: formatTrajectory(output.trajectory),
            final_answer: output.final_answer,
          }),
        });
        const scores = goalSchema.parse(result.output);
        return {
          score: (Math.max(1, Math.min(5, scores.score)) - 1) / 4,
          explanation: scores.summary,
        };
      } catch (error) {
        return {
          score: null,
          explanation: `Goal evaluation failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    },
  },
  ...createSemanticEvaluators(inferenceClient),
  {
    name: 'rca_hypothesis_focus',
    kind: 'LLM',
    direction: 'maximize',
    getVersion: () => promptVersion(FOCUS_SYSTEM_TEMPLATE, FOCUS_USER_TEMPLATE),
    evaluate: async ({ output }) => {
      if (!output.final_answer) return { score: null };
      try {
        const response = await inferenceClient.output({
          id: 'golden_hypothesis_focus',
          schema: judgeToolSchema(focusSchema),
          system: FOCUS_SYSTEM_TEMPLATE,
          input: renderPrompt(FOCUS_USER_TEMPLATE, {
            'final_answer[:4000]': output.final_answer.slice(0, 4000),
          }),
        });
        const scores = focusSchema.parse(response.output);
        const hypotheses = scores.num_hypotheses;
        const probability = scores.top_hypothesis_probability;
        const countScore =
          hypotheses >= 2 && hypotheses <= 3 ? 1 : hypotheses === 1 || hypotheses === 4 ? 0.5 : 0;
        const probabilityScore =
          probability === null ? 0 : Math.min(Math.max(0, Math.min(1, probability)) / 0.6, 1);
        return {
          score: round(
            (countScore +
              probabilityScore +
              Number(scores.hypotheses_are_distinct) +
              Number(scores.primary_hypothesis_is_specific)) /
              4
          ),
          explanation: `hypotheses=${hypotheses} top_p=${
            probability === null ? 'unstated' : `${round(probability * 100, 0)}%`
          } distinct=${pythonBool(scores.hypotheses_are_distinct)} specific=${pythonBool(
            scores.primary_hypothesis_is_specific
          )} | ${scores.reasoning}`,
        };
      } catch {
        return { score: null };
      }
    },
  },
  {
    name: 'rca_evidence_quality',
    kind: 'LLM',
    direction: 'maximize',
    getVersion: () => promptVersion(EVIDENCE_SYSTEM_TEMPLATE, EVIDENCE_USER_TEMPLATE),
    evaluate: async ({ output }) => {
      if (!output.final_answer) return { score: null };
      try {
        const response = await inferenceClient.output({
          id: 'golden_evidence_quality',
          schema: judgeToolSchema(evidenceSchema),
          system: EVIDENCE_SYSTEM_TEMPLATE,
          input: renderPrompt(EVIDENCE_USER_TEMPLATE, {
            'trajectory_text[:4000]': trajectoryText(output).slice(0, 4000),
            'final_answer[:4000]': output.final_answer.slice(0, 4000),
          }),
        });
        const scores = evidenceSchema.parse(response.output);
        const withEvidence = Math.max(0, scores.claims_with_metric_evidence);
        const total = withEvidence + Math.max(0, scores.claims_without_evidence);
        return {
          score: round(
            ((total > 0 ? withEvidence / total : 0) +
              Number(scores.evidence_is_quantitative) +
              Number(scores.causal_chain_grounded)) /
              3
          ),
          explanation: `grounded=${
            scores.claims_with_metric_evidence
          }/${total} quantitative=${pythonBool(
            scores.evidence_is_quantitative
          )} causal_chain=${pythonBool(scores.causal_chain_grounded)} | ${scores.reasoning}`,
        };
      } catch {
        return { score: null };
      }
    },
  },
];
