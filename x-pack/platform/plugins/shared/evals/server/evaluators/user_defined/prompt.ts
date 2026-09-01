/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPrompt } from '@kbn/inference-common';
import type { Prompt, ToolSchema, ToolSchemaType } from '@kbn/inference-common';
import { z } from '@kbn/zod/v4';
import type { EvidenceRound } from '../evidence/types';
import {
  JUDGE_EVIDENCE_TEMPLATE_VARIABLES,
  type JudgeScoreDefinition,
  type LlmJudgeConfig,
} from './types';

export const JUDGE_TOOL_NAME = 'evaluate';

/**
 * The variables a judge template is rendered with: the evidence it declared,
 * plus each reference-data key under its own name.
 */
export const buildJudgeInput = ({
  judge,
  round,
  referenceData,
}: {
  judge: LlmJudgeConfig;
  round: EvidenceRound;
  referenceData?: Record<string, unknown>;
}): Record<string, string> => {
  const input: Record<string, string> = {};

  if (judge.evidence.includes('input')) {
    input[JUDGE_EVIDENCE_TEMPLATE_VARIABLES.input] = round.input.message;
  }
  if (judge.evidence.includes('response')) {
    input[JUDGE_EVIDENCE_TEMPLATE_VARIABLES.response] = round.response.message;
  }
  if (judge.evidence.includes('steps')) {
    input[JUDGE_EVIDENCE_TEMPLATE_VARIABLES.steps] = JSON.stringify(round.steps);
  }

  for (const key of judge.reference_data_keys ?? []) {
    const value = referenceData?.[key];
    input[key] = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  }

  return input;
};

const buildScoreProperty = (score: JudgeScoreDefinition): ToolSchemaType => {
  const judgement: ToolSchemaType =
    score.type === 'categorical'
      ? {
          type: 'string',
          enum: (score.labels ?? []).map(({ value }) => value),
          description: 'The label that best describes your judgement.',
        }
      : {
          type: 'number',
          description: 'A score between 0 and 1, where 1 is the best possible outcome.',
        };

  const judgementKey = score.type === 'categorical' ? 'label' : 'score';

  return {
    type: 'object',
    ...(score.description ? { description: score.description } : {}),
    properties: {
      [judgementKey]: judgement,
      explanation: {
        type: 'string',
        description: 'A brief justification for this judgement, citing the evidence used.',
      },
    },
    required: [judgementKey, 'explanation'],
  };
};

/** The tool the judge reports through, one property per declared score. */
export const buildJudgeToolSchema = (judge: LlmJudgeConfig): ToolSchema => ({
  type: 'object',
  properties: Object.fromEntries(
    judge.output.scores.map((score) => [score.name, buildScoreProperty(score)])
  ),
  required: judge.output.scores.map(({ name }) => name),
});

/**
 * Builds the prompt for one judge. `createPrompt` is a plain builder with no
 * shared registry, so composing one per definition is safe to do per call.
 */
export const buildJudgePrompt = ({
  name,
  description,
  judge,
}: {
  name: string;
  description: string;
  judge: LlmJudgeConfig;
}): Prompt => {
  const variables = [
    ...judge.evidence.map((key) => JUDGE_EVIDENCE_TEMPLATE_VARIABLES[key]),
    ...(judge.reference_data_keys ?? []),
  ];

  return createPrompt({
    name: `user_defined_evaluator_${name}`,
    description,
    input: z.object(Object.fromEntries(variables.map((variable) => [variable, z.string()]))),
  })
    .version({
      system: { mustache: { template: judge.system_prompt } },
      template: { mustache: { template: judge.prompt } },
      tools: {
        [JUDGE_TOOL_NAME]: {
          description: `Report the evaluation for "${name}".`,
          schema: buildJudgeToolSchema(judge),
        },
      },
    })
    .get();
};
