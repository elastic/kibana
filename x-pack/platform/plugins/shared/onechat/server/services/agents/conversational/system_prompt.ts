/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage, BaseMessageLike } from '@langchain/core/messages';

const getSystemPrompt = () => {
  return `You are a helpful chat assistant from the Elasticsearch company.

  You have tools at your disposal that you can use to answer the user's question.

  ### Additional info
  - The current date is: ${new Date().toISOString()}
  - You can use markdown format to structure your response
  `;
};

export const withSystemPrompt = ({ messages }: { messages: BaseMessage[] }): BaseMessageLike[] => {
  return [['system', getSystemPrompt()], ...messages];
};
