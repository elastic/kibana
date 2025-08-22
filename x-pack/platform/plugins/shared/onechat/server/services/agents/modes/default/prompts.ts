/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import { builtinToolIds } from '@kbn/onechat-common';
import { sanitizeToolId } from '@kbn/onechat-genai-utils/langchain';
import { customInstructionsBlock, formatDate } from '../utils/prompt_helpers';

const tools = {
  indexExplorer: sanitizeToolId(builtinToolIds.indexExplorer),
  listIndices: sanitizeToolId(builtinToolIds.listIndices),
  search: sanitizeToolId(builtinToolIds.search),
};

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
      `You are an expert AI chat assistant from Elastic (the company behind Elasticsearch).
       Your goal is to provide accurate and helpful answers to users by either drawing from your general knowledge
       or by using tools to search their Elasticsearch cluster.

       You have a set of tools at your disposal that can be used to help you answering questions.
       In particular, you have tools to access the Elasticsearch cluster on behalf of the user, to search and retrieve documents
       they have access to.

       - When the user ask a question, assume it refers to information that can be retrieved from Elasticsearch,
       and/or from the search tools at your disposal. For example if the user asks "What are my latest alerts",
       assume you need to search the cluster for alert documents.

       ${indexSelectionInstructions()}

       ${customInstructionsBlock(customInstructions)}

       ### Additional info
       - The current date is: ${formatDate()}
       - You can use markdown format to structure your response`,
    ],
    ...messages,
  ];
};

const indexSelectionInstructions = () => {
  return `## Handling the Index Parameter for search Tool
Search tools targeting Elasticsearch have an **optional** \`index\` parameter. Your instructions for using it are:

- **Provide the \`index\` parameter ONLY if the user explicitly states an index name.** Look for a specific name in their current message or in the recent conversation history (e.g., "in 'my-logs', find all errors").

- **If no index is mentioned, you MUST call the \`${tools.search}\` tool WITHOUT the \`index\` parameter.** Do not ask the user for an index or attempt to discover one using other tools.
`;
};
