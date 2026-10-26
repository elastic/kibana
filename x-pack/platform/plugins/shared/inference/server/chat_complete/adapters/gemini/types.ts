/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  GenerateContentResponse as VertexGenerateContentResponse,
  Part,
} from '@google/generative-ai';

export interface GenerateContentResponseUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  thoughtsTokenCount?: number;
}

/**
 * Actual type for chunks, as the type from the google package is missing some
 * usage metadata.
 */
export type GenerateContentResponseChunk = VertexGenerateContentResponse & {
  usageMetadata?: GenerateContentResponseUsageMetadata;
};

/**
 * Actual type for the whole response, as the type from the google package is missing some
 * usage metadata.
 */
export type GenerateContentResponse = VertexGenerateContentResponse & {
  usageMetadata?: GenerateContentResponseUsageMetadata;
};

/**
 * We need to use the connector's format, not directly Gemini's...
 * In practice, 'parts' get mapped to 'content'
 *
 * See x-pack/platform/plugins/shared/stack_connectors/server/connector_types/gemini/gemini.ts
 */
export interface GeminiMessage {
  role: 'assistant' | 'user';
  parts: Part[];
}

export interface GeminiToolConfig {
  mode: 'AUTO' | 'ANY' | 'NONE';
  allowedFunctionNames?: string[];
}
