/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type { ConfigProperties } from '@kbn/inference-endpoint-ui-common';
import type {
  ConfigSchema,
  SecretsSchema,
  StreamingResponseSchema,
  ChatCompleteParamsSchema,
  ChatCompleteResponseSchema,
  RerankParamsSchema,
  RerankResponseSchema,
  SparseEmbeddingParamsSchema,
  TextEmbeddingParamsSchema,
  TextEmbeddingResponseSchema,
  UnifiedChatCompleteParamsSchema,
  UnifiedChatCompleteResponseSchema,
  DashboardActionParamsSchema,
  DashboardActionResponseSchema,
} from './schema';

export type Config = z.input<typeof ConfigSchema>;
export type Secrets = z.input<typeof SecretsSchema>;

export type UnifiedChatCompleteParams = z.infer<typeof UnifiedChatCompleteParamsSchema>;
export type UnifiedChatCompleteResponse = z.infer<typeof UnifiedChatCompleteResponseSchema>;

export type ChatCompleteParams = z.infer<typeof ChatCompleteParamsSchema>;
export type ChatCompleteResponse = z.infer<typeof ChatCompleteResponseSchema>;

export type RerankParams = z.infer<typeof RerankParamsSchema>;
export type RerankResponse = z.infer<typeof RerankResponseSchema>;

export type SparseEmbeddingParams = z.infer<typeof SparseEmbeddingParamsSchema>;

export type SparseEmbeddingResponse = Array<{}>;
// cannot directly infer type due to https://github.com/colinhacks/zod/issues/2938
// export type SparseEmbeddingResponse = TypeOf<typeof SparseEmbeddingResponseSchema>;

export type TextEmbeddingParams = z.infer<typeof TextEmbeddingParamsSchema>;
export type TextEmbeddingResponse = z.infer<typeof TextEmbeddingResponseSchema>;

export type StreamingResponse = z.infer<typeof StreamingResponseSchema>;

export type DashboardActionParams = z.infer<typeof DashboardActionParamsSchema>;
export type DashboardActionResponse = z.infer<typeof DashboardActionResponseSchema>;

export type FieldsConfiguration = Record<string, ConfigProperties>;
