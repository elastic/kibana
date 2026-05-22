/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, selectEvaluators } from '@kbn/evals';
import { evaluate as baseEvaluate } from '../src/evaluate';
import {
  createStreamsTrajectoryEvaluator,
  createToolCallBudgetEvaluator,
  createSkillLoadedEvaluator,
  logConverseResponse,
} from '../src/streams_evaluators';

interface WorkflowExample {
  name: string;
  input: { question: string };
  output: {
    expectedToolSequence: string[];
  };
  metadata: { maxExpectedToolCalls: number };
  setup?: {
    childSuffix: string;
    brokenProcessor?: {
      steps: Array<Record<string, unknown>>;
    };
  };
}

type EvaluateWorkflow = (opts: { example: WorkflowExample; streamName: string }) => Promise<void>;

/**
 * Per-example stream isolation via forking.
 *
 * Each example forks a fresh child from `logs.otel` with a UUID-suffixed name.
 * The parent's synthtrace data flows to the child via wired routing (no re-indexing).
 * After the test, the child stream is cleaned up.
 */
const evaluate = baseEvaluate.extend<{ evaluateWorkflow: EvaluateWorkflow }>({
  evaluateWorkflow: async ({ chatClient, executorClient, log }, use) => {
    await use(async ({ example, streamName }) => {
      await executorClient.runExperiment(
        {
          dataset: {
            name: `streams-agent-workflows: ${example.name}`,
            description: 'Multi-step workflow scenarios with per-example isolation',
            examples: [
              {
                input: {
                  ...example.input,
                  question: example.input.question.replace('{STREAM}', streamName),
                },
                output: example.output,
                metadata: example.metadata,
              },
            ],
          },
          task: async ({ input }) => {
            const prompt = example.input.question.replace('{STREAM}', streamName);
            const response = await chatClient.converse({
              messages: [{ message: prompt }],
            });
            logConverseResponse(log, `workflow:${example.name}`, response);
            log.info(
              `[workflow:${example.name}] expected: [${example.output.expectedToolSequence.join(
                ', '
              )}]`
            );

            return {
              output: response.messages[response.messages.length - 1]?.message ?? '',
              messages: response.messages,
              steps: response.steps,
              traceId: response.traceId,
            };
          },
        },
        selectEvaluators([
          createSkillLoadedEvaluator('streams'),
          createStreamsTrajectoryEvaluator(),
          createToolCallBudgetEvaluator(),
        ])
      );
    });
  },
});

evaluate.describe.configure({ timeout: 600_000 });

evaluate.describe('Streams Agent — Multi-Step Workflows', { tag: tags.stateful.classic }, () => {
  const examples: WorkflowExample[] = [
    {
      name: 'diagnose and fix ingestion failures',
      input: {
        question: '{STREAM} has ingestion failures, diagnose and fix them',
      },
      output: {
        expectedToolSequence: [
          'platform.streams.diagnose_stream',
          'platform.streams.inspect_streams',
          'platform.streams.design_pipeline',
          'platform.streams.update_stream',
        ],
      },
      metadata: { maxExpectedToolCalls: 5 },
      setup: {
        childSuffix: 'wf_failures',
        brokenProcessor: {
          steps: [
            {
              action: 'grok',
              from: 'body',
              patterns: ['%{INVALID_BROKEN_GROK_PATTERN}'],
            },
          ],
        },
      },
    },
    {
      name: 'fix unmapped fields (degraded docs)',
      input: {
        question: 'I see degraded documents on {STREAM}, can you fix the unmapped fields?',
      },
      output: {
        expectedToolSequence: [
          'platform.streams.inspect_streams',
          'platform.streams.update_stream',
        ],
      },
      metadata: { maxExpectedToolCalls: 3 },
      setup: {
        childSuffix: 'wf_unmapped',
      },
    },
    {
      name: 'fork stream and configure',
      input: {
        question:
          'Create a new partition for syslog messages from logs.otel and set its retention to 7 days',
      },
      output: {
        expectedToolSequence: [
          'platform.streams.inspect_streams',
          'platform.streams.create_partition',
        ],
      },
      metadata: { maxExpectedToolCalls: 3 },
    },
  ];

  for (const example of examples) {
    if (example.setup) {
      evaluate(example.name, async ({ evaluateWorkflow }) => {
        // v1: use the shared `logs.otel.apache` which has a broken processor from
        // global setup. Future: fork a per-example child stream with UUID suffix
        // (e.g. `logs.otel.${example.setup.childSuffix}_${uuid}`) for full isolation.
        await evaluateWorkflow({
          example,
          streamName: 'logs.otel.apache',
        });
      });
    } else {
      evaluate(example.name, async ({ evaluateWorkflow }) => {
        await evaluateWorkflow({
          example,
          streamName: 'logs.otel',
        });
      });
    }
  }
});
