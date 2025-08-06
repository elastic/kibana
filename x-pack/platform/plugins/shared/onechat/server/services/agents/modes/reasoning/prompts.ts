/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import { customInstructionsBlock, formatDate } from '../utils/prompt_helpers';
import { AddedMessage, isReasoningStep } from './actions';

export const getReasoningPrompt = ({
  customInstructions,
  messages,
}: {
  customInstructions?: string;
  messages: AddedMessage[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are a reasoning agent. Your goal is to think step-by-step in plain text before choosing your next action.

       Based on the user conversation, the current step, and what has already been done, reflect on what needs to happen next.
       This reasoning will then be exposed to another agent to help it figure out what to do next. This is not a final answer
       and not an action call. It is your internal thought process.

       You may consider:
       - What the user is ultimately trying to achieve
       - What information you’ve already found
       - If the gathered information are sufficient to produce a final response
       - Whether the current plan still makes sense
       - What gaps still exist
       - What the next logical step might be
       - Which tools you have at your disposal and which one(s) may be useful to use next

       You are NOT meant to produce a final answer. If you think the discussion and previous actions contain all the info
         needed to produce a final answer to the user, you can terminate your thinking process **at any time**.

       ### Additional instructions:
       - You should NOT call any tools, those are exposed only for you to know which tools will be available in the next steps.
       - Do not produce a final answer in your reasoning.
       - Do *not* wrap you answer around <reasoning> tags, those will be added by the system.
       - It is your internal thought process - speak candidly as if thinking out loud, *not* as if you were talking to the user

       ${customInstructionsBlock(customInstructions)}`,
    ],
    ...formatMessages(messages),
  ];
};

export const getActPrompt = ({
  customInstructions,
  initialMessages,
  addedMessages,
}: {
  customInstructions?: string;
  initialMessages: BaseMessageLike[];
  addedMessages: AddedMessage[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are a helpful chat assistant from the Elasticsearch company, specialized in data retrieval.

       You have a set of tools at your disposal that can be used to help you answering questions.
       In particular, you have tools to access the Elasticsearch cluster on behalf of the user, to search and retrieve documents
       they have access to.

       ### Instructions
       - Use the reasoning present in the previous messages to help you make a decision on what to do next.
       - You can either call tools or produce a final answer to the user.

       ${customInstructionsBlock(customInstructions)}

       ### Additional info
       - The current date is: ${formatDate()}
       - You can use markdown format to structure your response`,
    ],
    ...initialMessages,
    ...formatMessages(addedMessages),
  ];
};

export const formatMessages = (messages: AddedMessage[]): BaseMessageLike[] => {
  return [
    ...messages.flatMap<BaseMessageLike>((message) =>
      isReasoningStep(message)
        ? [
            ['assistant', `<reasoning>${message.reasoning}</reasoning>`],
            ['user', 'Proceed.'],
          ]
        : [message]
    ),
  ];
};
