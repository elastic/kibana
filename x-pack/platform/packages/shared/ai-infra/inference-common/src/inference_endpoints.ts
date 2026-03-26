/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Constants for all default (preconfigured) inference endpoints.
 */
export const defaultInferenceEndpoints = {
  JINAv5: '.jina-embeddings-v5-text-small',
  ELSER: '.elser-2-elasticsearch',
  ELSER_IN_EIS_INFERENCE_ID: '.elser-2-elastic',
  MULTILINGUAL_E5_SMALL: '.multilingual-e5-small-elasticsearch',
  KIBANA_DEFAULT_CHAT_COMPLETION: '.anthropic-claude-4.5-sonnet-chat_completion',
} as const;

/**
 * Constants for relevant inference providers
 */
export enum InferenceEndpointProvider {
  /** Elastic (on EIS) */
  Elastic = 'elastic',
  /** Claude on bedrock */
  AmazonBedrock = 'amazonbedrock',
  /** Azure OpenAI */
  AzureOpenAI = 'azureopenai',
  /** Gemini */
  GoogleVertexAI = 'googlevertexai',
  /** Open AI */
  OpenAI = 'openai',
}

export const elasticModelIds = {
  RainbowSprinkles: 'rainbow-sprinkles',
} as const;
