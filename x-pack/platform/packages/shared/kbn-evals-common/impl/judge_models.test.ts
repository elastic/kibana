/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument } from './schemas/common_attributes.gen';
import { resolveJudgeModelIds } from './judge_models';

const llmScore = (modelId: string) =>
  ({
    evaluator: { name: 'judge', kind: 'llm', score: 1, model: { id: modelId } },
  } as unknown as EvaluationScoreDocument);

const deterministicScore = () =>
  ({
    evaluator: { name: 'tokens', kind: 'deterministic', score: 100 },
  } as unknown as EvaluationScoreDocument);

describe('resolveJudgeModelIds', () => {
  it('returns the distinct LLM judge models, most frequent first', () => {
    const ids = resolveJudgeModelIds([
      llmScore('glm-5.2'),
      llmScore('gemini-3.0'),
      llmScore('glm-5.2'),
      deterministicScore(),
    ]);
    expect(ids).toEqual(['glm-5.2', 'gemini-3.0']);
  });

  it('ignores non-LLM evaluators and returns empty when no LLM scores exist', () => {
    expect(resolveJudgeModelIds([deterministicScore()])).toEqual([]);
    expect(resolveJudgeModelIds([])).toEqual([]);
  });
});
