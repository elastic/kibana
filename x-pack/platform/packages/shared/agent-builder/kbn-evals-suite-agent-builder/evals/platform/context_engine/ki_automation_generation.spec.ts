/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate as base } from '../../../src/evaluate';
import { createEvaluateDataset } from '../../../src/evaluate_dataset';
import type { EvaluateDataset } from '../../../src/evaluate_dataset';

// A minimal but fully valid AiIndexHttpItem for the "valid AI Index" scenario.
// Using a real-looking dest and a simple ES|QL source so Phase 1 discovery
// has something concrete to work with.
const VALID_AI_INDEX_JSON = JSON.stringify({
  id: 'eval-test-support-cases',
  name: 'Support Cases',
  description: 'AI Index for support case lookups by case number, status, and priority.',
  dest: {
    type: 'index',
    value: 'ai-index-idx-support-cases',
  },
  sources: [
    {
      type: 'esql',
      value: 'FROM raw-cases-all | LIMIT 1000',
    },
  ],
  automations: [],
  date_created: '2026-07-21T00:00:00.000Z',
  date_modified: '2026-07-21T00:00:00.000Z',
});

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'ki-automation-generation skill — AI Index gate',
  { tag: tags.serverless.security.complete },
  () => {
    evaluate('requests AI Index definition when none is provided', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ki-automation-generation: no AI Index provided',
          description:
            'Skill must block at Phase 0 and request an AI Index definition when none is in the conversation.',
          examples: [
            {
              input: {
                question: 'Help me set up the Context Engine.',
              },
              output: {
                expected:
                  'The agent loads the ki-automation-generation skill and responds by asking the user to provide an AI Index definition. It does not call list_indices or get_index_mapping.',
              },
              metadata: {
                expectedSkill: 'ki-automation-generation',
                requiredTerms: ['AI Index'],
              },
            },
          ],
        },
      });
    });

    evaluate('rejects invalid AI Index definition', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'ki-automation-generation: invalid AI Index provided',
          description:
            'Skill must reject a non-JSON or structurally invalid AI Index and explain what is wrong.',
          examples: [
            {
              input: {
                question: "My AI index is 'foobar'. Please set up the Context Engine using it.",
              },
              output: {
                expected:
                  "The agent explains that 'foobar' is not a valid AI Index definition and describes what a valid one looks like. It does not proceed to discovery or workflow generation.",
              },
              metadata: {
                expectedSkill: 'ki-automation-generation',
                requiredTerms: ['AI Index'],
              },
            },
          ],
        },
      });
    });

    evaluate(
      'proceeds to discovery when valid AI Index is provided',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'ki-automation-generation: valid AI Index provided',
            description:
              'Skill must pass Phase 0 and attempt Phase 1 discovery when a valid AiIndexHttpItem is in the conversation. The source index may not exist in the eval cluster, so the agent may report that the index was not found and ask how to proceed — that is acceptable as long as it attempted get_index_mapping and did not ask the user to provide an AI Index definition.',
            examples: [
              {
                input: {
                  question: `Here is my AI Index definition:\n\n${VALID_AI_INDEX_JSON}\n\nPlease set up the Context Engine for it.`,
                },
                output: {
                  expected:
                    'The agent validates the AI Index and proceeds to Phase 1 discovery. It calls get_index_mapping for raw-cases-all (the index parsed from the sources[] ES|QL query). If the index does not exist, it informs the user and asks how to proceed (e.g. ingest data first or point to a different index). It does NOT ask the user to provide an AI Index definition.',
                },
                metadata: {
                  expectedSkill: 'ki-automation-generation',
                },
              },
            ],
          },
        });
      }
    );
  }
);
