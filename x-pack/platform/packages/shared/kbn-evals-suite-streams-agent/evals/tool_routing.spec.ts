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

interface ToolRoutingExample {
  name: string;
  input: { question: string };
  output: { expectedToolSequence: string[] };
  metadata: { maxExpectedToolCalls: number };
}

type EvaluateToolRouting = (example: ToolRoutingExample) => Promise<void>;

const evaluate = baseEvaluate.extend<{ evaluateToolRouting: EvaluateToolRouting }>({
  evaluateToolRouting: async ({ chatClient, executorClient, log }, use) => {
    await use(async (example) => {
      await executorClient.runExperiment(
        {
          dataset: {
            name: `streams-agent-tool-routing: ${example.name}`,
            description: 'Verify single-intent prompts activate the correct tool',
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
            logConverseResponse(log, 'tool-routing', response);
            log.info(
              `[tool-routing] expected: [${example.output.expectedToolSequence.join(', ')}]`
            );
            return {
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

evaluate.describe.configure({ timeout: 300_000 });

evaluate.describe('Streams Agent — Tool Routing', { tag: tags.stateful.classic }, () => {
  const examples: ToolRoutingExample[] = [
    {
      name: 'inspect_streams: list',
      input: { question: 'List all my streams' },
      output: { expectedToolSequence: ['platform.streams.inspect_streams'] },
      metadata: { maxExpectedToolCalls: 1 },
    },
    {
      name: 'inspect_streams: schema',
      input: { question: 'What fields does logs.otel.linux have?' },
      output: { expectedToolSequence: ['platform.streams.inspect_streams'] },
      metadata: { maxExpectedToolCalls: 1 },
    },
    {
      name: 'inspect_streams: lifecycle',
      input: { question: 'How much storage is logs.otel using?' },
      output: { expectedToolSequence: ['platform.streams.inspect_streams'] },
      metadata: { maxExpectedToolCalls: 1 },
    },
    {
      name: 'diagnose_stream',
      input: { question: 'What ingestion errors has logs.otel.apache had recently?' },
      output: { expectedToolSequence: ['platform.streams.diagnose_stream'] },
      metadata: { maxExpectedToolCalls: 1 },
    },
    {
      name: 'query_documents',
      input: { question: 'Show me 10 recent documents from logs.otel' },
      output: { expectedToolSequence: ['platform.streams.query_documents'] },
      metadata: { maxExpectedToolCalls: 1 },
    },
    {
      name: 'design_pipeline',
      input: { question: 'How can I parse the body field of logs.otel.apache with grok?' },
      output: { expectedToolSequence: ['platform.streams.design_pipeline'] },
      metadata: { maxExpectedToolCalls: 4 },
    },
    {
      name: 'list_ilm_policies',
      input: { question: 'What retention policies can I apply to my streams?' },
      output: { expectedToolSequence: ['platform.streams.list_ilm_policies'] },
      metadata: { maxExpectedToolCalls: 2 },
    },
    {
      name: 'update_stream: description (write)',
      input: {
        question: "Update the description of logs.otel.linux to 'Linux system logs'",
      },
      output: {
        expectedToolSequence: [
          'platform.streams.inspect_streams',
          'platform.streams.update_stream',
        ],
      },
      metadata: { maxExpectedToolCalls: 2 },
    },
    {
      name: 'create_partition (write)',
      input: {
        question: 'Create a partition for syslog messages from logs.otel',
      },
      output: {
        expectedToolSequence: [
          'platform.streams.inspect_streams',
          'platform.streams.create_partition',
        ],
      },
      metadata: { maxExpectedToolCalls: 5 },
    },
    {
      name: 'delete_stream (write)',
      input: { question: 'Delete the stream logs.otel.linux' },
      output: {
        expectedToolSequence: [
          'platform.streams.inspect_streams',
          'platform.streams.delete_stream',
        ],
      },
      metadata: { maxExpectedToolCalls: 2 },
    },
  ];

  for (const example of examples) {
    evaluate(example.name, async ({ evaluateToolRouting }) => {
      await evaluateToolRouting(example);
    });
  }
});
