/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Constants for all default (preconfigured) inference endpoints.
 *
 * Versioned keys pin a specific model. `*_LATEST` keys are stable tier aliases
 * that should be reassigned when EIS ships a newer GA model in that family
 * (see https://www.elastic.co/docs/explore-analyze/elastic-inference/eis-supported-models).
 */
export const defaultInferenceEndpoints = {
  JINAv5: '.jina-embeddings-v5-text-small',
  ELSER: '.elser-2-elasticsearch',
  ELSER_IN_EIS_INFERENCE_ID: '.elser-2-elastic',
  MULTILINGUAL_E5_SMALL: '.multilingual-e5-small-elasticsearch',
  KIBANA_DEFAULT_CHAT_COMPLETION: '.anthropic-claude-4.6-sonnet-chat_completion',
  OPENAI_GPT_5_2: '.openai-gpt-5.2-chat_completion',
  OPENAI_GPT_5_4: '.openai-gpt-5.4-chat_completion',
  OPENAI_GPT_OSS_120B: '.openai-gpt-oss-120b-chat_completion',
  ANTHROPIC_CLAUDE_4_6_OPUS: '.anthropic-claude-4.6-opus-chat_completion',
  ANTHROPIC_CLAUDE_4_6_SONNET: '.anthropic-claude-4.6-sonnet-chat_completion',

  // Anthropic Claude (chat)
  ANTHROPIC_CLAUDE_OPUS_LATEST: '.anthropic-claude-5-opus-chat_completion',
  ANTHROPIC_CLAUDE_SONNET_LATEST: '.anthropic-claude-5-sonnet-chat_completion',
  ANTHROPIC_CLAUDE_HAIKU_LATEST: '.anthropic-claude-4.5-haiku-chat_completion',

  // Google Gemini (chat)
  GOOGLE_GEMINI_FLASH_LATEST: '.google-gemini-3.6-flash-chat_completion',
  GOOGLE_GEMINI_FLASH_LITE_LATEST: '.google-gemini-3.5-flash-lite-chat_completion',
  GOOGLE_GEMINI_PRO_LATEST: '.google-gemini-3.1-pro-chat_completion',

  // OpenAI (chat)
  OPENAI_GPT_LATEST: '.openai-gpt-5.5-chat_completion',
  OPENAI_GPT_MINI_LATEST: '.openai-gpt-5.4-mini-chat_completion',
  OPENAI_GPT_NANO_LATEST: '.openai-gpt-5.4-nano-chat_completion',
  OPENAI_GPT_OSS_LATEST: '.openai-gpt-oss-120b-chat_completion',
  OPENAI_GPT_OSS_SMALL_LATEST: '.openai-gpt-oss-20b-chat_completion',
  OPENAI_GPT_5_6_LUNA: '.openai-gpt-5.6-luna-chat_completion',
  OPENAI_GPT_5_6_SOL: '.openai-gpt-5.6-sol-chat_completion',
  OPENAI_GPT_5_6_TERRA: '.openai-gpt-5.6-terra-chat_completion',

  // z.ai (chat)
  ZAI_GLM_LATEST: '.zai-glm-5.2-chat_completion',

  // Embeddings
  JINA_EMBEDDINGS_TEXT_LATEST: '.jina-embeddings-v5-text-small',
  JINA_EMBEDDINGS_OMNI_LATEST: '.jina-embeddings-v5-omni-small',
  JINA_CLIP_LATEST: '.jina-clip-v2',
  GOOGLE_GEMINI_EMBEDDING_LATEST: '.google-gemini-embedding-2',
  OPENAI_TEXT_EMBEDDING_LARGE_LATEST: '.openai-text-embedding-3-large',
  OPENAI_TEXT_EMBEDDING_SMALL_LATEST: '.openai-text-embedding-3-small',

  // Rerankers
  JINA_RERANKER_LATEST: '.jina-reranker-v3.5',
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

export interface CspRegion {
  csp: string;
  region: string;
  geo?: string;
  region_display_name?: string;
}

/** A region entry that carries only a geographic zone with no CSP/region detail. */
export interface GeoOnlyRegion {
  geo: string;
}

/** Union of all region entry shapes returned by the EIS metadata.regions field. */
export type EisRegion = CspRegion | GeoOnlyRegion;

export type EisInferenceEndpointMetadata = {
  heuristics?: {
    properties?: string[];
    status?: string;
    release_date?: string;
    end_of_life_date?: string;
  } & Record<string, unknown>;
  display?: {
    name?: string;
    model_creator?: string;
  } & Record<string, unknown>;
  regions?: EisRegion[];
  denied_by_region_policy?: boolean;
} & Record<string, unknown>;
