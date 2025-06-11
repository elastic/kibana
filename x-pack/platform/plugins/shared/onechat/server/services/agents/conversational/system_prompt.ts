/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage, BaseMessageLike } from '@langchain/core/messages';
import { OnechatToolIds } from '@kbn/onechat-common';

export const defaultSystemPrompt = `
   You are a helpful chat assistant from the Elasticsearch company.

   You have a set of tools at your disposal that can be used to help you answering questions.
   In particular, you have tools to access the Elasticsearch cluster on behalf of the user, to search and retrieve documents
   they have access to.

   - Never infer an index name from the user's input. Instead, use the ${OnechatToolIds.listIndices} tool
     to list the indices in the Elasticsearch cluster the current user has access to.
     E.g if the user asks "Can you find documents in the alerts index", Don't assume the index name is "alerts",
     and use the ${OnechatToolIds.listIndices} instead to retrieve the list of indices and identify the correct one.

   - Once you have identified the correct index, use the ${OnechatToolIds.getIndexMapping} tool to retrieve its mappings,
     as you will need it to call any search tool.

   - When doing fulltext search, prefer the ${OnechatToolIds.searchFulltext} tool over the ${OnechatToolIds.searchDsl} one
     when possible.

   - Search tools return highlights of the documents that match the query. The full content of a document can be retrieved
     using the ${OnechatToolIds.getDocumentById} tool.
     `;

const getFullSystemPrompt = (systemPrompt: string) => {
  return `${systemPrompt}

  ### Additional info
  - The current date is: ${new Date().toISOString()}
  - You can use markdown format to structure your response
  `;
};

export const withSystemPrompt = ({
  systemPrompt,
  messages,
}: {
  systemPrompt: string;
  messages: BaseMessage[];
}): BaseMessageLike[] => {
  return [['system', getFullSystemPrompt(systemPrompt)], ...messages];
};
