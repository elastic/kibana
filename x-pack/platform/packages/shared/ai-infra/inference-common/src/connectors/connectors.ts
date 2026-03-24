/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The list of connector types that can be used with the inference APIs
 */
export enum InferenceConnectorType {
  OpenAI = '.gen-ai',
  Bedrock = '.bedrock',
  Gemini = '.gemini',
  Inference = '.inference',
}

export const allSupportedConnectorTypes = Object.values(InferenceConnectorType);

/**
 * Represents a stack connector that can be used for inference.
 */
export interface InferenceConnector {
  /** the type of the connector, see {@link InferenceConnectorType} */
  type: InferenceConnectorType;
  /** the name of the connector */
  name: string;
  /** the id of the connector */
  connectorId: string;
  /**
   * configuration (without secrets) of the connector.
   * the list of properties depends on the connector type (and subtype for inference)
   */
  config: Record<string, any>;
  /**
   * Capabilities of this connector.
   */
  capabilities: InferenceConnectorCapabilities;
  /**
   * When true, this entry represents an Elasticsearch inference endpoint
   * rather than a Kibana stack connector. `connectorId` holds the inference endpoint ID.
   */
  isInferenceEndpoint: boolean;
  /**
   * When true, this connector is preconfigured (i.e. managed by Elastic).
   * For native inference endpoints this is determined by the presence of
   * `metadata.display.name` on the underlying ES inference endpoint.
   */
  isPreconfigured: boolean;
}

export interface InferenceConnectorCapabilities {
  /**
   * The context window size for this connector, if the information is available.
   */
  contextWindowSize?: number;
}

/**
 * Connector types are living in the actions plugin and we can't afford
 * having dependencies from this package to some mid-level plugin,
 * so we're just using our own connector mixin type.
 */
export interface RawConnector {
  id: string;
  actionTypeId: string;
  name: string;
  config?: Record<string, any>;
  isPreconfigured?: boolean;
}

export interface RawInferenceConnector {
  id: string;
  actionTypeId: InferenceConnectorType;
  name: string;
  config?: Record<string, any>;
  isPreconfigured?: boolean;
}
