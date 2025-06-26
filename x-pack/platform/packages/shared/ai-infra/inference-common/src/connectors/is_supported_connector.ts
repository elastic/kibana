/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  InferenceConnectorType,
  RawInferenceConnector,
  RawConnector,
  allSupportedConnectorTypes,
} from './connectors';

export const COMPLETION_TASK_TYPE = 'chat_completion';

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
