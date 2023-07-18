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
