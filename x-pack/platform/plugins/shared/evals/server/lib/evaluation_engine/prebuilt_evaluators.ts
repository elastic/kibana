/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SKILL_RELEVANCE_PROMPT,
  SKILL_COMPLETENESS_PROMPT,
  SKILL_ACCURACY_PROMPT,
  SKILL_SPECIFICITY_PROMPT,
  SKILL_SAFETY_PROMPT,
  createBackingIndexValidator,
  createEsqlPatternEvaluator,
  createSkillPiiEvaluator,
  createSecretScannerEvaluator,
  createPromptInjectionEvaluator,
} from '@kbn/evals-extensions';
import type { Evaluator } from '@kbn/evals';
import type { ServerEvaluator, ServerEvaluatorParams } from './evaluator_registry';
import { agentEfficiencyEvaluator } from './code_evaluators/agent_efficiency';
import { esqlCompileEvaluator } from './code_evaluators/esql_compile';
import { indexResolvesEvaluator } from './code_evaluators/index_resolves';

/**
 * Extracts the first balanced JSON object from a string by counting braces.
 * Handles nested braces in values (e.g. explanation containing "{foo}").
 * Respects strings so braces inside JSON string values are not counted.
 */
const extractJsonObject = (text: string): string | null => {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
};

/**
 * Resolves the prompt template placeholders and calls the inference client.
 * Parses the JSON response to extract score, label, and explanation.
 */
const evaluateWithLlmJudge = async (
  promptTemplate: string,
  params: ServerEvaluatorParams,
  evaluatorName: string
): Promise<{ score: number | null; label?: string; explanation?: string }> => {
  if (!params.inferenceClient) {
    throw new Error(`${evaluatorName} requires an inference client`);
  }

  const input = params.input as Record<string, unknown>;
  const output = params.output;
  const outputStr = typeof output === 'string' ? output : JSON.stringify(output ?? '');

  // For skill quality prompts, {markdown} refers to the skill content (from input.markdown).
  // Falls back to outputStr for standalone evaluations where output IS the skill content.
  const markdownStr = input?.markdown ? String(input.markdown) : outputStr;

  const prompt = promptTemplate
    .replace(/\{input\}/g, JSON.stringify(input))
    .replace(/\{output\}/g, outputStr)
    .replace(/\{reference\}/g, JSON.stringify(params.expected ?? ''))
    .replace(/\{name\}/g, String(input?.name ?? ''))
    .replace(/\{description\}/g, String(input?.description ?? ''))
    .replace(/\{markdown\}/g, markdownStr)
    .replace(/\{query\}/g, String(input?.query ?? ''));

  const client = params.inferenceClient as {
    chatComplete: (p: {
      messages: Array<{ role: string; content: string }>;
    }) => Promise<{ content?: string }>;
  };

  const response = await client.chatComplete({
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = response.content ?? '';

  // Strip <think> tags and extract the outermost JSON object via brace balancing.
  // A non-greedy regex like /\{[\s\S]*?\}/ would truncate on nested braces
  // (e.g. explanation containing "{bar}"), so we count open/close braces instead.
  const cleaned = responseText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const jsonStr = extractJsonObject(cleaned);
  if (!jsonStr) {
    return { score: null, label: 'error', explanation: 'LLM judge did not return valid JSON' };
  }

  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    const rawScore = Number(parsed.score);
    const score = Number.isFinite(rawScore) ? rawScore : null;

    return {
      score,
      label: score !== null ? (score >= 0.7 ? 'pass' : 'fail') : 'error',
      explanation: String(parsed.explanation ?? parsed.reasoning ?? ''),
    };
  } catch {
    return { score: null, label: 'error', explanation: 'Failed to parse LLM judge response' };
  }
};

/**
 * Wraps a stateless `@kbn/evals` CODE evaluator (input/output/expected/metadata
 * only) into a `ServerEvaluator` (adds description/source + inferenceClient /
 * esClient-aware params). The CODE evaluators from `@kbn/evals-extensions`
 * don't need the extra params, so the adapter simply forwards the four base
 * fields.
 */
const adaptCodeEvaluator = (evaluator: Evaluator, description: string): ServerEvaluator => ({
  name: evaluator.name,
  kind: evaluator.kind,
  description,
  source: 'prebuilt',
  evaluate: async (params) => {
    // `@kbn/evals` Evaluator is generic over Example/TaskOutput which the
    // registry doesn't know about; the CODE evaluators we adapt here only
    // read the four base fields (input/output/expected/metadata), so we
    // cast through `unknown` and coerce the score/label to the narrower
    // ServerEvaluatorResult shape (which rejects `undefined`).
    const baseParams = {
      input: params.input,
      output: params.output,
      expected: params.expected,
      metadata: params.metadata,
    } as unknown as Parameters<typeof evaluator.evaluate>[0];
    const result = await evaluator.evaluate(baseParams);
    return {
      evaluator: evaluator.name,
      kind: evaluator.kind,
      score: result.score ?? null,
      label: result.label ?? undefined,
      explanation: result.explanation ?? undefined,
      metadata: result.metadata,
    };
  },
});

/**
 * Five skill-quality LLM-judge prompts. Used by both the individual prebuilt
 * evaluators and the ensemble (`skill-quality-ensemble`) that aggregates them.
 */
const SKILL_JUDGE_PROMPTS: Array<{ name: string; prompt: string }> = [
  { name: 'skill-relevance', prompt: SKILL_RELEVANCE_PROMPT },
  { name: 'skill-completeness', prompt: SKILL_COMPLETENESS_PROMPT },
  { name: 'skill-accuracy', prompt: SKILL_ACCURACY_PROMPT },
  { name: 'skill-specificity', prompt: SKILL_SPECIFICITY_PROMPT },
  { name: 'skill-safety', prompt: SKILL_SAFETY_PROMPT },
];

/**
 * Aggregates an array of numeric scores using the requested strategy and
 * computes a disagreement metric (population std dev, in [0, 0.5] for scores
 * in [0, 1]). Used by `skill-quality-ensemble`.
 */
const aggregateScores = (
  scores: number[],
  strategy: 'median' | 'mean' | 'min' = 'median'
): { aggregated: number; stddev: number } => {
  if (scores.length === 0) {
    return { aggregated: 0, stddev: 0 };
  }
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length;
  const stddev = Math.sqrt(variance);

  let aggregated: number;
  if (strategy === 'mean') {
    aggregated = mean;
  } else if (strategy === 'min') {
    aggregated = Math.min(...scores);
  } else {
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    aggregated = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  return { aggregated, stddev };
};

/**
 * Creates ServerEvaluator instances for the prebuilt skill evaluation preset.
 * These are full server evaluators that execute LLM calls — unlike the
 * @kbn/evals-extensions stubs which only generate prompts for CLI use.
 */
export const getPrebuiltEvaluators = (): ServerEvaluator[] => [
  {
    name: 'skill-relevance',
    kind: 'LLM',
    description:
      'Evaluates whether a skill addresses common SOC/security analyst workflows like alert triage, threat hunting, and incident response.',
    source: 'prebuilt',
    evaluate: async (params) => ({
      evaluator: 'skill-relevance',
      kind: 'LLM',
      ...(await evaluateWithLlmJudge(SKILL_RELEVANCE_PROMPT, params, 'skill-relevance')),
    }),
  },
  {
    name: 'skill-accuracy',
    kind: 'LLM',
    description:
      'Checks ES|QL syntax correctness, ECS field name accuracy, valid index patterns, and correct API references.',
    source: 'prebuilt',
    evaluate: async (params) => ({
      evaluator: 'skill-accuracy',
      kind: 'LLM',
      ...(await evaluateWithLlmJudge(SKILL_ACCURACY_PROMPT, params, 'skill-accuracy')),
    }),
  },
  {
    name: 'skill-completeness',
    kind: 'LLM',
    description:
      'Evaluates if a skill has step-by-step instructions, ES|QL examples, data source references, expected output descriptions, and error handling.',
    source: 'prebuilt',
    evaluate: async (params) => ({
      evaluator: 'skill-completeness',
      kind: 'LLM',
      ...(await evaluateWithLlmJudge(SKILL_COMPLETENESS_PROMPT, params, 'skill-completeness')),
    }),
  },
  {
    name: 'skill-specificity',
    kind: 'LLM',
    description:
      'Rates how specific and actionable a skill is — exact queries, concrete thresholds, and clear decision criteria vs generic advice.',
    source: 'prebuilt',
    evaluate: async (params) => ({
      evaluator: 'skill-specificity',
      kind: 'LLM',
      ...(await evaluateWithLlmJudge(SKILL_SPECIFICITY_PROMPT, params, 'skill-specificity')),
    }),
  },
  {
    name: 'skill-safety',
    kind: 'LLM',
    description:
      'Checks for destructive operations (DELETE, DROP, _delete_by_query), privilege escalation, and data exfiltration patterns.',
    source: 'prebuilt',
    evaluate: async (params) => ({
      evaluator: 'skill-safety',
      kind: 'LLM',
      ...(await evaluateWithLlmJudge(SKILL_SAFETY_PROMPT, params, 'skill-safety')),
    }),
  },
  // CODE evaluators — no LLM cost, run before LLM judges and gate them.
  agentEfficiencyEvaluator,
  esqlCompileEvaluator,
  indexResolvesEvaluator,
  adaptCodeEvaluator(
    createBackingIndexValidator(),
    'Flags references to backing index names (.ds-*, .internal.*) instead of aliases/data streams.'
  ),
  adaptCodeEvaluator(
    createEsqlPatternEvaluator(),
    'Static regex check for ES|QL pipeline structure and known commands.'
  ),
  adaptCodeEvaluator(
    createSkillPiiEvaluator(),
    'Flags hard-coded PII (emails, SSNs, cards, IPs) in the skill markdown.'
  ),
  adaptCodeEvaluator(
    createSecretScannerEvaluator(),
    'Flags hard-coded secrets (AWS keys, GitHub tokens, JWTs, webhooks) in the skill markdown.'
  ),
  adaptCodeEvaluator(
    createPromptInjectionEvaluator(),
    'Flags prompt-injection markers (role override, jailbreak persona, fake system blocks, zero-width chars).'
  ),
  // Multi-judge ensemble: runs all five skill-quality LLM judges in parallel
  // and aggregates their scores (median by default). Surfaces per-judge
  // disagreement in metadata so the UI / CI gate can flag high-variance
  // evaluations where judges sharply disagree.
  {
    name: 'skill-quality-ensemble',
    kind: 'LLM',
    description:
      'Runs all skill-quality judges (relevance, completeness, accuracy, specificity, safety) in parallel, reports an aggregated score plus a per-judge breakdown and disagreement (std dev) to flag unstable evaluations.',
    source: 'prebuilt',
    evaluate: async (params) => {
      const results = await Promise.all(
        SKILL_JUDGE_PROMPTS.map(async ({ name, prompt }) => ({
          name,
          result: await evaluateWithLlmJudge(prompt, params, name),
        }))
      );

      const breakdown = results.map(({ name, result }) => ({
        evaluator: name,
        score: result.score,
        label: result.label,
        explanation: result.explanation,
      }));

      const validScores = results
        .map((r) => r.result.score)
        .filter((s): s is number => s != null && Number.isFinite(s));

      if (validScores.length === 0) {
        return {
          evaluator: 'skill-quality-ensemble',
          kind: 'LLM',
          score: null,
          label: 'error',
          explanation: 'All five judges failed to return a valid score',
          metadata: { breakdown, strategy: 'median', disagreement: null },
        };
      }

      const { aggregated, stddev } = aggregateScores(validScores, 'median');
      // Map stddev -> agreement in [0,1] (0.5 is max possible std dev for [0,1] scores)
      const agreement = Math.max(0, 1 - stddev / 0.5);
      const highDisagreement = stddev > 0.2;

      return {
        evaluator: 'skill-quality-ensemble',
        kind: 'LLM',
        score: aggregated,
        label: highDisagreement ? 'disagreement' : aggregated >= 0.7 ? 'pass' : 'fail',
        explanation: `Median of ${validScores.length} judge scores = ${aggregated.toFixed(
          2
        )} (std dev ${stddev.toFixed(2)}, agreement ${agreement.toFixed(2)}).${
          highDisagreement ? ' Judges disagree — review per-judge breakdown.' : ''
        }`,
        metadata: {
          breakdown,
          strategy: 'median',
          disagreement: stddev,
          agreement,
          validJudgeCount: validScores.length,
        },
      };
    },
  },
];
