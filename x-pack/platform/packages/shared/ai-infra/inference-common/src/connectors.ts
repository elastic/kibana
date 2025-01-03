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

export const COMPLETION_TASK_TYPE = 'completion';

const allSupportedConnectorTypes = Object.values(InferenceConnectorType);

export interface InferenceConnector {
  type: InferenceConnectorType;
  name: string;
  connectorId: string;
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
 * 2. for inference connectors, if its taskType is "completion"
 */
export function isSupportedConnector(connector: RawConnector): connector is RawInferenceConnector {
  if (!isSupportedConnectorType(connector.actionTypeId)) {
    return false;
  }
  if (connector.actionTypeId === InferenceConnectorType.Inference) {
    const config = connector.config ?? {};
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
