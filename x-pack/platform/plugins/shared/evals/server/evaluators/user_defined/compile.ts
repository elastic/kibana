/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_JUDGE_SCORE_DIRECTION,
  getJudgeScoreDirection,
  type Direction,
} from '@kbn/evals-common';
import { runLlmJudge } from '../llm_judge';
import type { EvaluatorDefinition, EvaluatorResult } from '../types';
import { JUDGE_TOOL_NAME, buildJudgeInput, buildJudgePrompt } from './prompt';
import { buildEvidenceSchema, buildReferenceDataSchema } from './schemas';
import type { EvaluatorDefinitionDocument, JudgeScoreDefinition, LlmJudgeConfig } from './types';

/**
 * The direction reported for the judge as a whole, which readers that predate per-score
 * direction fall back to. Taken from the scores when they all agree; a mixed judge has no
 * single right answer, so it keeps the default it always reported.
 */
const getEvaluatorDirection = (judge: LlmJudgeConfig): Direction => {
  const directions = new Set(judge.output.scores.map(getJudgeScoreDirection));
  const [direction] = directions;
  return directions.size === 1 ? direction : DEFAULT_JUDGE_SCORE_DIRECTION;
};

interface JudgeScoreOutput {
  score?: unknown;
  label?: unknown;
  explanation?: unknown;
}

type JudgeOutput = Record<string, JudgeScoreOutput | undefined>;

const toExplanation = (value: unknown, scoreName: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Judge returned no explanation for "${scoreName}"`);
  }
  return value;
};

const toScore = (
  definition: JudgeScoreDefinition,
  output: JudgeScoreOutput
): { score: number; label?: string } => {
  if (definition.type === 'number') {
    if (typeof output.score !== 'number' || !Number.isFinite(output.score)) {
      throw new Error(`Judge returned no numeric score for "${definition.name}"`);
    }
    if (output.score < 0 || output.score > 1) {
      throw new Error(`Judge returned an out-of-range score for "${definition.name}"`);
    }

    return { score: output.score };
  }

  if (typeof output.label !== 'string' || !output.label) {
    throw new Error(`Judge returned no label for "${definition.name}"`);
  }

  const match = (definition.labels ?? []).find(({ value }) => value === output.label);
  if (!match) {
    throw new Error(`Judge returned unknown label "${output.label}" for "${definition.name}"`);
  }

  return { score: match.score, label: output.label };
};

export const mapJudgeOutput = (judge: LlmJudgeConfig, output: JudgeOutput): EvaluatorResult => ({
  scores: judge.output.scores.map((definition) => {
    const scoreOutput = output[definition.name];
    if (!scoreOutput || typeof scoreOutput !== 'object') {
      throw new Error(`Judge returned no result for "${definition.name}"`);
    }

    const { score, label } = toScore(definition, scoreOutput);
    const explanation = toExplanation(scoreOutput.explanation, definition.name);

    return {
      name: definition.name,
      score,
      ...(label !== undefined ? { label } : {}),
      explanation,
      metadata: { judge: scoreOutput },
      direction: getJudgeScoreDirection(definition),
    };
  }),
});

/**
 * Turns a stored definition into the same `EvaluatorDefinition` a built-in
 * presents, so nothing downstream of the registry has to know which it got.
 */
export const compileUserDefinedEvaluator = (
  document: EvaluatorDefinitionDocument
): EvaluatorDefinition => {
  const { name, version, description, judge } = document;
  const prompt = buildJudgePrompt({ name, description, judge });

  return {
    name,
    version,
    kind: 'llm',
    origin: 'user_defined',
    description,
    direction: getEvaluatorDirection(judge),
    referenceDataSchema: buildReferenceDataSchema(judge.reference_data_keys),
    evidenceSchema: buildEvidenceSchema(judge.evidence),
    async evaluate({ round, referenceData, inferenceClient }) {
      if (!inferenceClient) {
        throw new Error(`Inference client is required for evaluator "${name}"`);
      }

      const output = await runLlmJudge<JudgeOutput>({
        inferenceClient,
        prompt,
        toolName: JUDGE_TOOL_NAME,
        input: buildJudgeInput({ judge, round, referenceData }),
      });

      return mapJudgeOutput(judge, output);
    },
  };
};
