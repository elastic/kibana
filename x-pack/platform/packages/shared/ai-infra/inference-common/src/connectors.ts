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

export const COMPLETION_TASK_TYPE = 'chat_completion';

const allSupportedConnectorTypes = Object.values(InferenceConnectorType);

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
}

/**
 * Checks if a given connector type is compatible for inference.
 *
 * Note: this check is not sufficient to assert if a given connector can be
 * used for inference, as `.inference` connectors need additional check logic.
 * Please use `isSupportedConnector` instead when possible.
 */
export function isSupportedConnectorType(id: string): id is InferenceConnectorType {
  return allSupportedConnectorTypes.includes(id as InferenceConnectorType);
}

/**
 * Checks if a given connector is compatible for inference.
 *
 * A connector is compatible if:
 * 1. its type is in the list of allowed types
 * 2. for inference connectors, if its taskType is "chat_completion"
 */
export function isSupportedConnector(connector: RawConnector): connector is RawInferenceConnector {
  if (!isSupportedConnectorType(connector.actionTypeId)) {
    return false;
  }
  if (connector.actionTypeId === InferenceConnectorType.Inference) {
    const config = connector.config ?? {};
    // only chat_completion endpoint can be used for inference
    if (config.taskType !== COMPLETION_TASK_TYPE) {
      return false;
    }
  }
  return true;
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
}

interface RawInferenceConnector {
  id: string;
  actionTypeId: InferenceConnectorType;
  name: string;
  config?: Record<string, any>;
}
