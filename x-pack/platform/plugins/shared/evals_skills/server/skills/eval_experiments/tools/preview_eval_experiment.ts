/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { generateExperimentRun, generateSavedWorkflowYaml } from '@kbn/evals-plugin/server';
import {
  evalExperimentConfigSchema,
  evalsTools,
  otherResult,
  toErrorResult,
  toGenerateParams,
} from './common';
import type { EvalExperimentsToolDeps } from './deps';

const schema = evalExperimentConfigSchema;

/**
 * Composes an experiment configuration into the workflow YAML and run plan that
 * would be produced, without writing or executing anything. Use it to let the
 * user review the experiment before saving or running.
 */
export const previewEvalExperimentTool = (
  _deps: EvalExperimentsToolDeps
): BuiltinSkillBoundedTool<typeof schema> => ({
  id: evalsTools.previewExperiment,
  type: ToolType.builtin,
  description:
    'Preview an evaluation experiment: returns the generated workflow YAML and the run plan (mode, execution count) for the given configuration. Read-only — it does not save or run anything.',
  schema,
  handler: async (config) => {
    try {
      const params = toGenerateParams(config);
      const saved = generateSavedWorkflowYaml(params);
      const run = generateExperimentRun(params);

      return otherResult({
        workflow_name: saved.name,
        workflow_yaml: saved.yaml,
        run_plan: {
          mode: run.mode,
          execution_count: run.executions.length,
          compare_by: run.compareBy,
        },
      });
    } catch (error) {
      return toErrorResult(error, 'Failed to preview experiment');
    }
  },
});
