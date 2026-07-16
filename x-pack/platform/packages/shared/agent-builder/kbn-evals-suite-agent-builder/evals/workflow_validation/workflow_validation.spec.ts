/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    (
      { chatClient, evaluators, executorClient, workflowValidationClient, traceEsClient, log },
      use
    ) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          workflowValidationClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'Workflow Validation Smoke - AgentBuilder',
  { tag: tags.stateful.classic },
  () => {
    evaluate('validates authored workflow YAML end-to-end', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: workflow-validation-smoke',
          description: 'Smoke test exercising the WorkflowValidation L4 evaluator',
          examples: [
            {
              input: {
                question:
                  'Write the raw YAML (in a ```yaml fenced code block, no tool calls) for a workflow ' +
                  'that logs the message "Hello from workflow smoke test" using the console step, ' +
                  'triggered manually. Reply with only the YAML — do not create or save the workflow yourself.',
              },
              output: {
                expected: 'A valid workflow YAML with a console step and manual trigger.',
              },
              metadata: {
                query_intent: 'Procedural',
                validateWorkflow: true,
              },
            },
          ],
        },
      });
    });
  }
);
