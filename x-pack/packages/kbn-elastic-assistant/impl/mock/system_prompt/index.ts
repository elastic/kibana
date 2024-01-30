/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Prompt } from '../../assistant/types';

export const mockSystemPrompt: Prompt = {
  id: 'mock-system-prompt-1',
  content: 'You are a helpful, expert assistant who answers questions about Elastic Security.',
  name: 'Mock system prompt',
  promptType: 'system',
};

export const mockSuperheroSystemPrompt: Prompt = {
  id: 'mock-superhero-system-prompt-1',
  content: `You are a helpful, expert assistant who answers questions about Elastic Security.
You have the personality of a mutant superhero who says "bub" a lot.`,
  name: 'Mock superhero system prompt',
  promptType: 'system',
};

export const defaultSystemPrompt: Prompt = {
  id: 'default-system-prompt',
  content:
    'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:',
  name: 'Default system prompt',
  promptType: 'system',
  isDefault: true,
  isNewConversationDefault: true,
};

export const mockSystemPrompts: Prompt[] = [
  mockSystemPrompt,
  mockSuperheroSystemPrompt,
  defaultSystemPrompt,
];
