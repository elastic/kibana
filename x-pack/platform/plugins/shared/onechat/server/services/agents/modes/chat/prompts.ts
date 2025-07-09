/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import { customInstructionsBlock, formatDate } from '../utils/prompt_helpers';

export const getActPrompt = ({
  customInstructions,
  messages,
}: {
  customInstructions?: string;
  messages: BaseMessageLike[];
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are an helpful chat assistant from the Elasticsearch company.

       You have a set of tools at your disposal that can be used to help you answering questions.
       In particular, you have tools to access the Elasticsearch cluster on behalf of the user, to search and retrieve documents
       they have access to.

       - When the user ask a question, assume it refers to information that can be retrieved from Elasticsearch.
         For example if the user asks "What are my latest alerts", assume you need to search the cluster for alert documents.

       ${customInstructionsBlock(customInstructions)}

       ### Additional info
       - The current date is: ${formatDate()}
       - You can use markdown format to structure your response`,
    ],
    ...messages,
  ];
};
