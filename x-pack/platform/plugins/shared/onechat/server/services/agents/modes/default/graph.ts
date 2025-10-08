/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { StateGraph, Annotation } from '@langchain/langgraph';
import type { BaseMessage, BaseMessageLike, AIMessage } from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages';
import { messagesStateReducer } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { StructuredTool } from '@langchain/core/tools';
import { tool } from '@langchain/core/tools';
import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ResolvedAgentCapabilities } from '@kbn/onechat-common';
import type { AgentEventEmitter } from '@kbn/onechat-server';
import { createReasoningEvent } from '@kbn/onechat-genai-utils/langchain';
import { getActPrompt, getAnswerPrompt } from './prompts';

const StateAnnotation = Annotation.Root({
  // inputs
  initialMessages: Annotation<BaseMessageLike[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  // outputs
  addedMessages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

export const answerToolId = 'to_answer';

const answerTool = tool(
  async () => {
    throw new Error('Answer tool should not be called');
  },
  {
    name: answerToolId,
    schema: z.object({
      handoverReason: z
        .string()
        .optional()
        .describe(
          'Brief explanation of the reason why you are handing the conversation over to the answering agent'
        ),
      comments: z
        .string()
        .optional()
        .describe(
          `(optional) Can be used to provide additional context or feedback to the answering agent.
           This can be used to ask the agent to ask for clarification in case of ambiguous or unclear questions.`
        ),
    }),
    description: `Use this tool to notify that you are ready to answer the question.

    Notes: The answering agent will have access to all information you gathered - you do not need to summarize your finding in the comments.
    Instead, this field can be used to leave notes which would be useful for the answering agent to consider when answering the question.`,
  }
);

export type StateType = typeof StateAnnotation.State;

export const createAgentGraph = ({
  chatModel,
  tools,
  customInstructions,
  capabilities,
  logger,
  events,
}: {
  chatModel: InferenceChatModel;
  tools: StructuredTool[];
  capabilities: ResolvedAgentCapabilities;
  customInstructions?: string;
  logger: Logger;
  events: AgentEventEmitter;
}) => {
  const allTools = [...tools, answerTool];
  const toolNode = new ToolNode<typeof StateAnnotation.State.addedMessages>(allTools);

  const model = chatModel.bindTools(allTools, { tool_choice: 'any' }).withConfig({
    tags: ['onechat-agent'],
  });

  const callModel = async (state: StateType) => {
    events.emit(createReasoningEvent('Thinking about my next action'));
    const response = await model.invoke(
      getActPrompt({
        customInstructions,
        capabilities,
        messages: [...state.initialMessages, ...state.addedMessages],
      })
    );
    return {
      addedMessages: [response],
    };
  };

  const shouldContinue = async (state: StateType) => {
    const messages = state.addedMessages;
    const lastMessage: AIMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.tool_calls?.length) {
      const toolCall = lastMessage.tool_calls[0];
      if (toolCall.name === answerToolId) {
        return 'prepareToAnswer';
      } else {
        return 'tools';
      }
    }
    return '__end__';
  };

  const toolHandler = async (state: StateType) => {
    const toolNodeResult = await toolNode.invoke(state.addedMessages);

    return {
      addedMessages: [...toolNodeResult],
    };
  };

  const prepareToAnswer = async (state: StateType) => {
    const messages = state.addedMessages;
    const lastMessage: AIMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.tool_calls?.length) {
      return {
        addedMessages: [
          new ToolMessage({
            content: JSON.stringify({ output: 'forwarding_to:answering_agent' }),
            tool_call_id: lastMessage.tool_calls[0].id!,
          }),
        ],
      };
    }
    return {};
  };

  const answeringModel = chatModel.withConfig({
    tags: ['onechat-agent', 'answering-step'],
  });

  const generateAnswer = async (state: StateType) => {
    events.emit(createReasoningEvent('Summarizing my findings'));
    const response = await answeringModel.invoke(
      getAnswerPrompt({
        customInstructions,
        capabilities,
        discussion: [...state.initialMessages, ...state.addedMessages],
      })
    );
    return {
      addedMessages: [response],
    };
  };

  // note: the node names are used in the event convertion logic, they should *not* be changed
  const graph = new StateGraph(StateAnnotation)
    .addNode('agent', callModel)
    .addNode('tools', toolHandler)
    .addNode('prepareToAnswer', prepareToAnswer)
    .addNode('answer', generateAnswer)
    .addEdge('__start__', 'agent')
    .addEdge('tools', 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      prepareToAnswer: 'prepareToAnswer',
      __end__: '__end__',
    })
    .addEdge('prepareToAnswer', 'answer')
    .addEdge('answer', '__end__')
    .compile();

  return graph;
};
