/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { EVAL_EXPERIMENTS_SKILL_CONTENT } from './content';
import { getEvalExperimentsInlineTools } from './tools';
import type { EvalExperimentsToolDeps } from './tools/deps';

/**
 * Agent Builder skill that helps compose, preview, save, and run evaluation
 * experiments (for agents and tools) via the evals workflow engine.
 */
export const createEvalExperimentsSkill = (deps: EvalExperimentsToolDeps) =>
  defineSkillType({
    id: 'eval-experiment-authoring',
    name: 'eval-experiment-authoring',
    basePath: 'skills/platform/evals',
    description:
      'Compose, preview, save, and run evaluation (evals) experiments for Agent Builder agents and tools: discover datasets/evaluators/targets, generate the experiment workflow, and launch or persist it.',
    content: EVAL_EXPERIMENTS_SKILL_CONTENT,
    getInlineTools: () => getEvalExperimentsInlineTools(deps),
  });
