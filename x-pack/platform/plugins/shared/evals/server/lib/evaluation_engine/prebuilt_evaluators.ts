/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable import/no-extraneous-dependencies, @kbn/imports/no_boundary_crossing */
import {
  SKILL_RELEVANCE_PROMPT,
  SKILL_COMPLETENESS_PROMPT,
  SKILL_ACCURACY_PROMPT,
  SKILL_SPECIFICITY_PROMPT,
  SKILL_SAFETY_PROMPT,
} from '@kbn/evals-extensions';
import type { ServerEvaluator, ServerEvaluatorParams } from './evaluator_registry';
import { agentEfficiencyEvaluator } from './code_evaluators/agent_efficiency';

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
  // CODE evaluator — no LLM cost
  agentEfficiencyEvaluator,
];
