/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { StepCategory } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';

export const EVALS_RUN_SUITE_STEP_TYPE = 'evals.runSuite' as const;

export const EvalsRunSuiteStepInputSchema = z.object({
  suite_id: z.string().describe('The experiment suite ID to run.'),
  task_connector_id: z.string().describe('The inference connector ID used by the suite tasks.'),
  judge_connector_id: z
    .string()
    .describe('The inference connector ID used by suite evaluators/judges.'),
  suite_params: z.record(z.string(), z.unknown()).optional(),
  repetitions: z.number().int().min(1).optional().describe('Number of repetitions per example.'),
  concurrency: z.number().int().min(1).optional().describe('Maximum in-suite concurrency.'),
  selected_evaluators: z.array(z.string()).optional().describe('Optional evaluator IDs to run.'),
});

export type EvalsRunSuiteStepInput = z.infer<typeof EvalsRunSuiteStepInputSchema>;

export const EvalsRunSuiteStepOutputSchema = z.object({
  run_id: z.string(),
  suite_id: z.string(),
  exported: z.object({
    attempted: z.number().int(),
    created: z.number().int(),
    conflicts: z.number().int(),
  }),
});

export type EvalsRunSuiteStepOutput = z.infer<typeof EvalsRunSuiteStepOutputSchema>;

export const evalsRunSuiteCommonStepDefinition: CommonStepDefinition<
  typeof EvalsRunSuiteStepInputSchema,
  typeof EvalsRunSuiteStepOutputSchema
> = {
  id: EVALS_RUN_SUITE_STEP_TYPE,
  category: StepCategory.Ai,
  label: i18n.translate('xpack.evals.workflowsSteps.runSuite.label', {
    defaultMessage: 'Run evaluation suite',
  }),
  description: i18n.translate('xpack.evals.workflowsSteps.runSuite.description', {
    defaultMessage: 'Execute a registered experiment suite inside Kibana and export scores.',
  }),
  documentation: {
    details: i18n.translate('xpack.evals.workflowsSteps.runSuite.documentation.details', {
      defaultMessage:
        'The evals.runSuite step runs an experiment suite registered with the Evals plugin. It executes suite logic inside the Kibana server process and exports score documents to the `kibana-evaluations*` data stream.',
    }),
    examples: [
      `## Run an experiment suite
\`\`\`yaml
- name: run_eval_suite
  type: ${EVALS_RUN_SUITE_STEP_TYPE}
  with:
    suite_id: "my_suite"
    task_connector_id: "my_task_connector"
    judge_connector_id: "my_judge_connector"
    suite_params:
      foo: "bar"
    repetitions: 3
\`\`\``,
    ],
  },
  inputSchema: EvalsRunSuiteStepInputSchema,
  outputSchema: EvalsRunSuiteStepOutputSchema,
};
