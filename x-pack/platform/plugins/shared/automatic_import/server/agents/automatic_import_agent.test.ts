/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';
import { createAutomaticImportAgent } from './automatic_import_agent';
import {
  INGEST_PIPELINE_GENERATOR_PROMPT,
  LOG_AND_ECS_ANALYZER_PROMPT,
  REVIEW_AGENT_PROMPT,
} from './prompts';
import {
  createIngestPipelineGeneratorAgent,
  createLogAndEcsAnalyzerAgent,
  createReviewAgent,
} from './sub_agents';
import type { UserProvidedContext } from './user_context';

interface FakeTurn {
  readonly content?: string;
  readonly taskFor?: string;
}

const messageText = (message: BaseMessage): string =>
  typeof message.content === 'string' ? message.content : JSON.stringify(message.content);

class ScriptedChatModel extends BaseChatModel {
  readonly calls: Array<readonly BaseMessage[]> = [];
  private turnIndex = 0;

  constructor(private readonly turns: readonly FakeTurn[]) {
    super({});
  }

  _llmType(): string {
    return 'scripted-chat-model';
  }

  bindTools(): this {
    return this;
  }

  async _generate(messages: BaseMessage[]): Promise<ChatResult> {
    this.calls.push(messages);
    const { content = '', taskFor } = this.turns[Math.min(this.turnIndex, this.turns.length - 1)];
    this.turnIndex++;

    const message = new AIMessage({
      content,
      tool_calls: taskFor
        ? [
            {
              type: 'tool_call',
              id: `task-${this.turnIndex}`,
              name: 'task',
              args: { subagent_name: taskFor, description: `Run ${taskFor}` },
            },
          ]
        : [],
    });

    return { generations: [{ message, text: content }] };
  }

  getSubAgentTask(prompt: string): string | undefined {
    const call = this.calls.find(([systemMessage]) =>
      messageText(systemMessage).startsWith(prompt)
    );
    return call?.slice(1).map(messageText).join('\n');
  }
}

const SCRIPT: readonly FakeTurn[] = [
  { taskFor: 'log_and_ecs_analyzer' },
  { content: 'Analysis complete.' },
  { taskFor: 'ingest_pipeline_generator' },
  { content: 'Pipeline complete.' },
  { taskFor: 'review_agent' },
  { content: 'Review passed.' },
  { content: 'Done.' },
];

const SUB_AGENT_PROMPTS = [
  ['log_and_ecs_analyzer', LOG_AND_ECS_ANALYZER_PROMPT],
  ['ingest_pipeline_generator', INGEST_PIPELINE_GENERATOR_PROMPT],
  ['review_agent', REVIEW_AGENT_PROMPT],
] as const;

const runAgent = async (userContext?: UserProvidedContext): Promise<ScriptedChatModel> => {
  const model = new ScriptedChatModel(SCRIPT);
  const agent = createAutomaticImportAgent({
    model: model as unknown as InferenceChatModel,
    samples: ['{"src":"10.0.0.1"}'],
    userContext,
    subagents: [
      createLogAndEcsAnalyzerAgent({ prompt: '', tools: [] }),
      createIngestPipelineGeneratorAgent({
        name: 'ingest_pipeline_generator',
        description: 'Generates the pipeline',
        prompt: INGEST_PIPELINE_GENERATOR_PROMPT,
        tools: [],
      }),
      createReviewAgent({ prompt: '', tools: [] }),
    ],
  });

  await agent.invoke({
    messages: [new HumanMessage('Generate a pipeline.')],
    current_pipeline: { processors: [{ set: { field: 'ecs.version', value: '9.3.0' } }] },
  } as Parameters<typeof agent.invoke>[0]);

  return model;
};

describe('createAutomaticImportAgent', () => {
  it.each(SUB_AGENT_PROMPTS)(
    'sends the user descriptions to %s during a run',
    async (_agentName, prompt) => {
      const model = await runAgent({
        integrationDescription: 'Acme firewall',
        dataStreamDescription: 'Traffic logs in key=value format',
      });

      const task = model.getSubAgentTask(prompt);
      expect(task).toContain('<user_provided_context>');
      expect(task).toContain('<integration_description>Acme firewall</integration_description>');
      expect(task).toContain(
        '<data_stream_description>Traffic logs in key=value format</data_stream_description>'
      );
    }
  );

  it.each(SUB_AGENT_PROMPTS)(
    'leaves the user context out for %s when there are no descriptions',
    async (_agentName, prompt) => {
      const model = await runAgent();

      const task = model.getSubAgentTask(prompt);
      expect(task).toContain('<task>');
      expect(task).not.toContain('<user_provided_context>');
    }
  );
});
