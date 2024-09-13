/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptResponse } from '@kbn/elastic-assistant-common';

export const mockSystemPrompt: PromptResponse = {
  id: 'mock-system-prompt-1',
  content: 'You are a helpful, expert assistant who answers questions about Elastic Security.',
  name: 'Mock system prompt',
  consumer: 'securitySolutionUI',
  promptType: 'system',
};

export const mockSuperheroSystemPrompt: PromptResponse = {
  id: 'mock-superhero-system-prompt-1',
  content: `You are a helpful, expert assistant who answers questions about Elastic Security.
You have the personality of a mutant superhero who says "bub" a lot.`,
  name: 'Mock superhero system prompt',
  consumer: 'securitySolutionUI',
  promptType: 'system',
};

export const defaultSystemPrompt: PromptResponse = {
  id: 'default-system-prompt',
  content:
    'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:',
  name: 'Default system prompt',
  promptType: 'system',
  consumer: 'securitySolutionUI',
  isDefault: true,
  isNewConversationDefault: true,
};

export const defaultQuickPrompt: PromptResponse = {
  id: 'default-system-prompt',
  content:
    'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:',
  name: 'Default system prompt',
  promptType: 'quick',
  consumer: 'securitySolutionUI',
  color: 'red',
};

export const mockSystemPrompts: PromptResponse[] = [
  mockSystemPrompt,
  mockSuperheroSystemPrompt,
  defaultSystemPrompt,
];
