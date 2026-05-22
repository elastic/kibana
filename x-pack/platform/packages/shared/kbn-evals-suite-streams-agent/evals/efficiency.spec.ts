/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, selectEvaluators, type Evaluator } from '@kbn/evals';
import { evaluate as baseEvaluate } from '../src/evaluate';
import {
  createStreamsTrajectoryEvaluator,
  createToolCallBudgetEvaluator,
  createSkillLoadedEvaluator,
  createParameterAssertionEvaluator,
  logConverseResponse,
} from '../src/streams_evaluators';

interface ParameterAssertion {
  toolId: string;
  description: string;
  check: (params: Record<string, unknown>) => boolean;
}

interface EfficiencyExample {
  name: string;
  input: { question: string };
  output: { expectedToolSequence: string[] };
  metadata: { maxExpectedToolCalls: number; guard: string };
  parameterAssertions?: ParameterAssertion[];
}

type EvaluateEfficiency = (example: EfficiencyExample) => Promise<void>;

const evaluate = baseEvaluate.extend<{ evaluateEfficiency: EvaluateEfficiency }>({
  evaluateEfficiency: async ({ chatClient, executorClient, log }, use) => {
    await use(async (example) => {
      const evaluators: Evaluator[] = [
        createSkillLoadedEvaluator('streams'),
        createStreamsTrajectoryEvaluator(),
        createToolCallBudgetEvaluator(),
      ];
      if (example.parameterAssertions?.length) {
        evaluators.push(createParameterAssertionEvaluator(example.parameterAssertions));
      }

      await executorClient.runExperiment(
        {
          dataset: {
            name: `streams-agent-efficiency: ${example.name}`,
            description: 'Guard against redundant tool call regressions',
            examples: [
              {
                input: example.input,
                output: example.output,
                metadata: example.metadata,
              },
            ],
          },
          task: async () => {
            const response = await chatClient.converse({
              messages: [{ message: example.input.question }],
            });
            logConverseResponse(log, 'efficiency', response);
            log.info(`[efficiency] expected: [${example.output.expectedToolSequence.join(', ')}]`);
            return {
              messages: response.messages,
              steps: response.steps,
              traceId: response.traceId,
            };
          },
        },
        selectEvaluators(evaluators)
      );
    });
  },
});

evaluate.describe.configure({ timeout: 300_000 });

evaluate.describe('Streams Agent — Efficiency Regressions', { tag: tags.stateful.classic }, () => {
  const examples: EfficiencyExample[] = [
    {
      name: 'batch read: multiple streams in one call',
      input: {
        question: 'Tell me about logs.otel.apache and logs.otel.linux',
      },
      output: { expectedToolSequence: ['platform.streams.inspect_streams'] },
      metadata: {
        maxExpectedToolCalls: 1,
        guard:
          'Should use a single inspect_streams call with both stream names, not two separate calls',
      },
      parameterAssertions: [
        {
          toolId: 'platform.streams.inspect_streams',
          description: 'names should include both logs.otel.apache and logs.otel.linux',
          check: (params) => {
            const names = params.names as string[] | undefined;
            return (
              Array.isArray(names) &&
              names.includes('logs.otel.apache') &&
              names.includes('logs.otel.linux')
            );
          },
        },
      ],
    },
    {
      name: 'no post-write verification: set retention',
      input: { question: 'Set the retention on logs.otel.linux to 30 days' },
      output: {
        expectedToolSequence: [
          'platform.streams.inspect_streams',
          'platform.streams.update_stream',
        ],
      },
      metadata: {
        maxExpectedToolCalls: 2,
        guard: 'Should NOT call read tools after write succeeds',
      },
    },
    {
      name: 'no post-write verification: update description',
      input: {
        question: "Update the description of logs.otel.linux to 'Updated linux logs'",
      },
      output: {
        expectedToolSequence: ['platform.streams.update_stream'],
      },
      metadata: {
        maxExpectedToolCalls: 2,
        guard: 'Should NOT call inspect_streams after description update succeeds',
      },
    },
    {
      name: 'batch read: storage across all streams',
      input: { question: 'How much storage are all my streams using?' },
      output: {
        expectedToolSequence: ['platform.streams.inspect_streams'],
      },
      metadata: {
        maxExpectedToolCalls: 1,
        guard: 'Should use a single inspect_streams call with lifecycle aspect, not multiple calls',
      },
      parameterAssertions: [
        {
          toolId: 'platform.streams.inspect_streams',
          description: 'aspects should include lifecycle for storage information',
          check: (params) => {
            const aspects = params.aspects as string[] | undefined;
            return Array.isArray(aspects) && aspects.includes('lifecycle');
          },
        },
      ],
    },
    {
      name: 'batch read: quality across all streams',
      input: { question: 'Tell me about the data quality across all streams' },
      output: {
        expectedToolSequence: ['platform.streams.inspect_streams'],
      },
      metadata: {
        maxExpectedToolCalls: 1,
        guard: 'Should use a single inspect_streams call with quality aspect, not multiple calls',
      },
      parameterAssertions: [
        {
          toolId: 'platform.streams.inspect_streams',
          description: 'aspects should include quality for data quality information',
          check: (params) => {
            const aspects = params.aspects as string[] | undefined;
            return Array.isArray(aspects) && aspects.includes('quality');
          },
        },
      ],
    },
  ];

  for (const example of examples) {
    evaluate(example.name, async ({ evaluateEfficiency }) => {
      await evaluateEfficiency(example);
    });
  }
});
