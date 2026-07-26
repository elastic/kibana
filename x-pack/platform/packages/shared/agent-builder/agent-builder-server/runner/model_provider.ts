/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import type {
  BoundInferenceClient,
  InferenceConnector,
  ChatCompletionTokenCount,
} from '@kbn/inference-common';
import type { EffortLevel } from '@kbn/agent-builder-common';

/**
 * Represents a model that can be used within the agentBuilder framework (e.g. tools).
 *
 * It exposes different interfaces to models.
 */
export interface ScopedModel {
  /**
   * The connector bound to this scoped model.
   */
  connector: InferenceConnector;
  /**
   * langchain chat model.
   */
  chatModel: InferenceChatModel;
  /**
   * Inference client.
   */
  inferenceClient: BoundInferenceClient;
}

export interface ModelSelectionPreferences {
  effortLevel?: EffortLevel;
}

/**
 * Provider, allowing to select various models depending on the needs.
 */
export interface ModelProvider {
  /**
   * Returns the default model used for LLM tasks in the current context.
   */
  getDefaultModel: () => Promise<ScopedModel>;

  /**
   * Returns the best available model based on the given selection options.
   *
   * Available options are:
   * - effortLevel: the effort level of the task the model will be used for.
   */
  selectModel: (opts: ModelSelectionPreferences) => Promise<ScopedModel>;

  /**
   * Returns a model using the given connectorId.
   *
   * Will throw if connector doesn't exist, user has no access, or connector is not a GenAI connector.
   */
  getModelById: (options: { connectorId: string }) => Promise<ScopedModel>;
  /**
   * Returns the current usage stats for the model provider.
   */
  getUsageStats: () => ModelProviderStats;
}

export interface ModelCallInfo {
  connectorId: string;
  tokens?: ChatCompletionTokenCount;
  model?: string;
}

export interface ModelProviderStats {
  calls: ModelCallInfo[];
}
