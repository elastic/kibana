/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { EVAL_DATASET_MANAGEMENT_SKILL_CONTENT } from './content';
import { getEvalDatasetManagementInlineTools } from './tools';
import type { EvalDatasetManagementToolDeps } from './tools/deps';

/**
 * Agent Builder skill that helps compose, preview, save, and run evaluation
 * experiments (for agents and tools) via the evals workflow engine.
 */
export const createEvalDatasetManagementSkill = (deps: EvalDatasetManagementToolDeps) =>
  defineSkillType({
    id: 'eval-dataset-management',
    name: 'eval-dataset-management',
    basePath: 'skills/platform/evals',
    description: 'Manage evaluation datasets: create, update, delete, and curate them.',
    content: EVAL_DATASET_MANAGEMENT_SKILL_CONTENT,
    getInlineTools: () => getEvalDatasetManagementInlineTools(deps),
  });
