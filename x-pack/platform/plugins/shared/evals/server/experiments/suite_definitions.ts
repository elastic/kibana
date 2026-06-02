/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { MessageRole } from '@kbn/inference-common';
import type { Example, Evaluator } from '@kbn/evals-runner';
import type { ExperimentSuiteDefinition } from './types';
import {
  createDatasetExperimentRunner,
  genericInferenceTask,
  createServerCriteriaEvaluator,
  type TaskContext,
  type EvaluatorContext,
} from './create_dataset_experiment_runner';

const defaultCriteria = [
  'The output is relevant to the input question or prompt',
  'The output is factually accurate given available context',
  'The output is well-structured and coherent',
];

const defaultEvaluators = (ctx: EvaluatorContext): Evaluator[] => [
  createServerCriteriaEvaluator({
    inferenceClient: ctx.judgeInferenceClient,
    criteria: defaultCriteria,
  }),
];

const suite = (
  id: string,
  name: string,
  tags: string[],
  overrides?: {
    description?: string;
    task?: (ctx: TaskContext, example: Example) => Promise<unknown>;
    evaluators?: (ctx: EvaluatorContext) => Evaluator[];
    concurrency?: number;
    defaultRepetitions?: number;
  }
): ExperimentSuiteDefinition => ({
  id,
  name,
  description: overrides?.description,
  tags,
  inputSchema: z.unknown(),
  defaultRepetitions: overrides?.defaultRepetitions,
  run: createDatasetExperimentRunner({
    datasetName: id,
    task: overrides?.task ?? genericInferenceTask,
    evaluators: overrides?.evaluators ?? defaultEvaluators,
    concurrency: overrides?.concurrency,
  }),
});

export const experimentSuiteDefinitions: ExperimentSuiteDefinition[] = [
  suite('agent-builder', 'Agent Builder', ['platform', 'agent-builder'], {
    description:
      'Evaluates the Agent Builder converse API across knowledge base, product docs, and security skills.',
    task: async (ctx, example) => {
      const input = example.input ?? {};
      const question = String(input.question ?? input.prompt ?? JSON.stringify(input));

      const response = await ctx.inferenceClient.chatComplete({
        system:
          'You are an AI assistant with access to Elasticsearch and Kibana. Answer the user question based on available context.',
        messages: [{ role: MessageRole.User, content: question }],
        abortSignal: ctx.abortSignal,
      });

      return response.content;
    },
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The response answers the question accurately',
          'The response references relevant documentation or tools when applicable',
          'The response is well-structured and actionable',
        ],
      }),
    ],
  }),

  suite('esql-generation', 'ES|QL Generation Evaluations', ['platform', 'esql'], {
    description: 'Evaluates ES|QL query generation from natural language questions.',
    task: async (ctx, example) => {
      const input = example.input ?? {};
      const question = String(input.question ?? input.prompt ?? JSON.stringify(input));

      const response = await ctx.inferenceClient.chatComplete({
        system: `You are an expert at generating Elasticsearch ES|QL queries. Given a natural language question, respond with ONLY a valid ES|QL query. Do not include any explanation.`,
        messages: [{ role: MessageRole.User, content: question }],
        temperature: 0,
        abortSignal: ctx.abortSignal,
      });

      return response.content;
    },
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The generated query is valid ES|QL syntax',
          'The query is semantically equivalent to what the natural language question asks for',
          'The query uses appropriate ES|QL commands and functions',
        ],
      }),
    ],
  }),

  suite('streams', 'Streams', ['platform', 'streams'], {
    description:
      'Evaluates Streams pipeline suggestions and grok/dissect pattern extraction quality.',
    task: async (ctx, example) => {
      const input = example.input ?? {};
      const question = String(
        input.question ?? input.prompt ?? input.sample_document ?? JSON.stringify(input)
      );

      const response = await ctx.inferenceClient.chatComplete({
        system:
          'You are an expert at creating Elasticsearch ingest pipelines and parsing patterns (grok/dissect). Analyze the input and provide an appropriate pipeline configuration or pattern.',
        messages: [{ role: MessageRole.User, content: question }],
        abortSignal: ctx.abortSignal,
      });

      return response.content;
    },
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The output contains a valid pipeline configuration or parsing pattern',
          'The pipeline/pattern correctly processes the provided sample data',
          'The response addresses all fields mentioned in the input',
        ],
      }),
    ],
  }),

  suite('significant-events', 'Significant Events', ['platform', 'significant-events'], {
    description:
      'Evaluates significant event detection including KI query generation, feature extraction, and deduplication.',
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The generated query or event identification is relevant to the scenario',
          'The output correctly identifies or classifies the significant event',
          'The reasoning is grounded in the provided data context',
        ],
      }),
    ],
  }),

  suite('llm-tasks', 'LLM Tasks', ['ai-infra'], {
    description: 'Evaluates LLM infrastructure tasks such as documentation retrieval quality.',
    task: async (ctx, example) => {
      const input = example.input ?? {};
      const searchTerm = String(
        input.searchTerm ?? input.question ?? input.prompt ?? JSON.stringify(input)
      );

      const response = await ctx.inferenceClient.chatComplete({
        system:
          'You are a documentation retrieval assistant. Given a search term, retrieve and summarize the most relevant documentation.',
        messages: [{ role: MessageRole.User, content: searchTerm }],
        abortSignal: ctx.abortSignal,
      });

      return response.content;
    },
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The response contains relevant documentation for the search term',
          'The retrieved information is non-empty and substantive',
          'The response includes references to Elastic documentation where applicable',
        ],
      }),
    ],
  }),

  suite('obs-ai-assistant', 'Observability AI Assistant', ['observability', 'ai-assistant'], {
    description:
      'Evaluates the Observability AI Assistant across documentation, ES|QL, APM, alerts, and knowledge base scenarios.',
    task: async (ctx, example) => {
      const input = example.input ?? {};
      const question = String(input.question ?? input.prompt ?? JSON.stringify(input));

      const response = await ctx.inferenceClient.chatComplete({
        system:
          'You are the Observability AI Assistant for Elastic. Help users with APM, logs, metrics, alerts, ES|QL queries, and infrastructure monitoring questions.',
        messages: [{ role: MessageRole.User, content: question }],
        abortSignal: ctx.abortSignal,
      });

      return response.content;
    },
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The response is relevant to the observability question',
          'The response demonstrates domain expertise in APM, logs, metrics, or alerts',
          'The response is accurate and provides actionable information',
        ],
      }),
    ],
  }),

  suite('observability-ai', 'Observability AI', ['observability', 'observability-ai'], {
    description:
      'Evaluates Observability AI features including default agent conversations and AI insights.',
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The response correctly addresses the observability scenario',
          'The AI insight or agent response is factually grounded',
          'The output is well-structured and useful for an operations engineer',
        ],
      }),
    ],
  }),

  suite('security-ai-rules', 'Security AI Rules', ['security', 'ai-rules'], {
    description:
      'Evaluates AI-generated security detection rules including ES|QL, KQL, and EQL rule generation.',
    task: async (ctx, example) => {
      const input = example.input ?? {};
      const prompt = String(input.prompt ?? input.question ?? JSON.stringify(input));

      const response = await ctx.inferenceClient.chatComplete({
        system: `You are an expert security analyst specializing in Elastic Security detection rules. Given a description, generate a valid detection rule with appropriate query, name, description, severity, risk score, and MITRE ATT&CK mapping. Respond in JSON format.`,
        messages: [{ role: MessageRole.User, content: prompt }],
        temperature: 0,
        abortSignal: ctx.abortSignal,
      });

      return response.content;
    },
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The generated rule contains valid query syntax for the specified rule type',
          'The rule has appropriate severity, risk score, and MITRE ATT&CK mapping',
          'The rule name and description accurately reflect the detection intent',
          'The generated rule would detect the scenario described in the input',
        ],
      }),
    ],
  }),

  suite('endpoint', 'Endpoint (Elastic Defend)', ['security', 'defend-workflows'], {
    description:
      'Evaluates automatic troubleshooting for Elastic Defend endpoint protection scenarios.',
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The troubleshooting response addresses the specific endpoint issue',
          'The response provides actionable steps to resolve the problem',
          'The response references relevant Elastic Defend configuration or policies',
        ],
      }),
    ],
  }),

  suite('entity-analytics', 'Security Entity Analytics', ['security', 'entity-analytics'], {
    description:
      'Evaluates entity analytics AI capabilities including risk scoring, asset criticality, and multi-skill routing.',
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The response correctly handles the entity analytics query',
          'Risk scores and entity information are properly interpreted',
          'The response demonstrates understanding of the security entity model',
        ],
      }),
    ],
  }),

  suite('entity-analytics-v2', 'Security Entity Analytics V2', ['security', 'entity-analytics'], {
    description:
      'Evaluates Entity Store V2 capabilities including entity search and multi-skill routing.',
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The response correctly routes to the appropriate Entity Store V2 skill',
          'Entity search results are properly interpreted and presented',
          'The response handles multi-skill scenarios correctly',
        ],
      }),
    ],
  }),

  suite('attack-discovery', 'Attack Discovery', ['security', 'attack-discovery'], {
    description:
      'Evaluates attack discovery insight generation from security alerts using bundled alert scenarios.',
    task: async (ctx, example) => {
      const input = example.input ?? {};
      const alerts = input.alerts ?? input.context ?? input;

      const response = await ctx.inferenceClient.chatComplete({
        system: `You are a security analyst performing attack discovery. Analyze the provided security alerts and generate insights about potential attacks, including: attack chain description, MITRE ATT&CK tactics, affected entities, and recommended actions. Respond in JSON format with an "insights" array.`,
        messages: [
          {
            role: MessageRole.User,
            content: `Analyze these security alerts and generate attack discovery insights:\n\n${JSON.stringify(
              alerts
            )}`,
          },
        ],
        temperature: 0,
        abortSignal: ctx.abortSignal,
      });

      return response.content;
    },
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The output contains structured attack discovery insights',
          'Each insight references relevant MITRE ATT&CK tactics or techniques',
          'The insights correctly identify attack patterns from the alert data',
          'Affected entities are properly identified',
        ],
      }),
    ],
  }),

  suite('workflows', 'Workflows Authoring', ['platform', 'workflows'], {
    description: 'Evaluates workflow creation and editing via natural language instructions.',
    task: async (ctx, example) => {
      const input = example.input ?? {};
      const instruction = String(
        input.instruction ?? input.question ?? input.prompt ?? JSON.stringify(input)
      );

      const response = await ctx.inferenceClient.chatComplete({
        system:
          'You are an expert at creating Kibana Workflows from natural language descriptions. Generate a valid workflow definition in YAML format based on the instruction.',
        messages: [{ role: MessageRole.User, content: instruction }],
        abortSignal: ctx.abortSignal,
      });

      return response.content;
    },
    evaluators: (ctx) => [
      createServerCriteriaEvaluator({
        inferenceClient: ctx.judgeInferenceClient,
        criteria: [
          'The output contains a valid workflow definition',
          'The workflow correctly implements the requested behavior',
          'The workflow structure is efficient and follows best practices',
          'No errors are present in the workflow definition',
        ],
      }),
    ],
  }),
];
