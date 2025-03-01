/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AzureOpenAI } from 'openai';

export interface OpenAIClient extends AzureOpenAI {
  model: string;
}

export function createOpenAIClient(): OpenAIClient {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? '2025-01-01-preview';

  const openAIClient = new AzureOpenAI({
    apiKey,
    endpoint,
    deployment,
    apiVersion,
  }) as OpenAIClient;
  const model = process.env.AZURE_OPENAI_MODEL || `gpt-4o`;

  // chat complete methods require a model parameter,
  // so we expose it on the client in order to ~fully
  // encapsulate config
  openAIClient.model = model;

  return openAIClient;
}
