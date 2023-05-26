/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantUiSettings } from '../../assistant/helpers';

export const mockApiConfig: AssistantUiSettings = {
  virusTotal: {
    apiKey: 'mock',
    baseUrl: 'https://www.virustotal.com/api/v3',
  },
  openAI: {
    apiKey: 'mock',
    baseUrl:
      'https://example.com/openai/deployments/example/chat/completions?api-version=2023-03-15-preview',
  },
};
