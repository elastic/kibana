/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptResponse } from '@kbn/elastic-assistant-common';

export const mockUserPrompt: PromptResponse = {
  id: 'mock-user-prompt-1',
  content: `Explain the meaning from the context above, then summarize a list of suggested Elasticsearch KQL and EQL queries.
Finally, suggest an investigation guide, and format it as markdown.`,
  name: 'Mock user prompt',
  promptType: 'quick',
};
