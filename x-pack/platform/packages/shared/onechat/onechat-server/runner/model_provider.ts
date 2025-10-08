/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { BoundInferenceClient, InferenceConnector } from '@kbn/inference-common';

/**
 * Represents a model that can be used within the onechat framework (e.g. tools).
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

/**
 * Provider, allowing to select various models depending on the needs.
 */
export interface ModelProvider {
  /**
   * Returns the default model to be used for LLM tasks.
   *
   * Will use Elasticsearch LLMs by default if present, otherwise will pick
   * the first GenAI compatible connector.
   */
  getDefaultModel: () => Promise<ScopedModel>;
  /**
   * Returns a model using the given connectorId.
   *
   * Will throw if connector doesn't exist, user has no access, or connector
   * is not a GenAI connector.
   */
  getModel: (options: { connectorId: string }) => Promise<ScopedModel>;
}
