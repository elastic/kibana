/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createSkillRelevanceEvaluator } from './relevance';
import { createSkillCompletenessEvaluator } from './completeness';
import { createSkillAccuracyEvaluator } from './accuracy';
import { createSkillSpecificityEvaluator } from './specificity';
import { createSkillSafetyEvaluator } from './safety';
import { createBackingIndexValidator } from '../code/backing_index_validator';
import { createEsqlPatternEvaluator } from '../code/esql_pattern';
import { createSkillPiiEvaluator } from '../code/skill_pii';

export interface SkillPresetConfig {
  weights?: Record<string, number>;
  requiredPass?: string[];
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  safety: 0.25,
  accuracy: 0.2,
  completeness: 0.2,
  relevance: 0.2,
  specificity: 0.15,
};

const DEFAULT_REQUIRED_PASS = ['skill-safety', 'backing-index-validator', 'skill-pii'];

export const createSkillEvaluatorPreset = (config?: SkillPresetConfig) => ({
  evaluators: [
    createSkillRelevanceEvaluator(),
    createSkillCompletenessEvaluator(),
    createSkillAccuracyEvaluator(),
    createSkillSpecificityEvaluator(),
    createSkillSafetyEvaluator(),
    createBackingIndexValidator(),
    createEsqlPatternEvaluator(),
    createSkillPiiEvaluator(),
  ] as Evaluator[],
  weights: config?.weights ?? DEFAULT_WEIGHTS,
  requiredPass: config?.requiredPass ?? DEFAULT_REQUIRED_PASS,
});
