/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChatCompletionTokenCount, Model } from '@kbn/inference-common';

export interface TokenUsageContext {
  connectorId: string;
  featureId?: string;
  parentFeatureId?: string;
  modelId?: string;
  modelCreator?: string;
  modelName?: string;
  provider?: string;
}

export interface TokenUsageContextInput {
  connectorId: string;
  model?: Partial<Model>;
  modelName?: string;
  featureId?: string;
  parentFeatureId?: string;
}

export const buildTokenUsageContext = ({
  connectorId,
  model,
  modelName,
  featureId,
  parentFeatureId,
}: TokenUsageContextInput): TokenUsageContext => ({
  connectorId,
  modelId: modelName ?? model?.id,
  modelCreator: model?.creator ?? model?.provider,
  provider: model?.platform ?? 'unknown',
  modelName: model?.name ?? model?.id ?? 'unknown',
  featureId,
  parentFeatureId,
});

export interface TokenUsageDocument {
  '@timestamp': string;
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    thinking_tokens?: number;
    total_tokens: number;
    cached_tokens?: number;
  };
  model: {
    model_id?: string;
    model_creator?: string;
    model_name?: string;
    provider?: string;
  };
  inference: {
    connector_id: string;
    feature_id?: string;
    parent_feature_id?: string;
  };
}

export const mapTokenCountToDocument = ({
  tokens,
  model,
  context,
}: {
  tokens: ChatCompletionTokenCount;
  model?: string;
  context: TokenUsageContext;
}): TokenUsageDocument => {
  return {
    '@timestamp': new Date().toISOString(),
    token_usage: {
      prompt_tokens: tokens.prompt,
      completion_tokens: tokens.completion,
      ...(tokens.thinking !== undefined ? { thinking_tokens: tokens.thinking } : {}),
      total_tokens: tokens.total,
      ...(tokens.cached !== undefined ? { cached_tokens: tokens.cached } : {}),
    },
    model: {
      model_id: model ?? context.modelId,
      model_creator: context.modelCreator,
      model_name: context.modelName,
      provider: context.provider,
    },
    inference: {
      connector_id: context.connectorId,
      feature_id: context.featureId,
      parent_feature_id: context.parentFeatureId,
    },
  };
};
