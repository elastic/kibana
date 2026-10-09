/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { EvalExperimentsToolDeps } from './deps';
import { listEvalDatasetsTool } from './list_eval_datasets';
import { listEvaluatorsTool } from './list_evaluators';
import { listEvalTargetsTool } from './list_eval_targets';
import { listConnectorsTool } from './list_eval_connectors';
import { previewEvalExperimentTool } from './preview_eval_experiment';
import { saveEvalExperimentTool } from './save_eval_experiment';
import { runEvalExperimentTool } from './run_eval_experiment';

export { evalsTools } from './common';
export type { EvalExperimentsToolDeps } from './deps';

/**
 * The inline tools exposed by the eval-experiment-authoring skill, in the recommended
 * order of use: discover -> preview -> save/run.
 */
export const getEvalExperimentsInlineTools = (
  deps: EvalExperimentsToolDeps
): SkillBoundedTool[] => [
  listEvalDatasetsTool(deps),
  listEvaluatorsTool(deps),
  listEvalTargetsTool(deps),
  listConnectorsTool(deps),
  previewEvalExperimentTool(deps),
  saveEvalExperimentTool(deps),
  runEvalExperimentTool(deps),
];
