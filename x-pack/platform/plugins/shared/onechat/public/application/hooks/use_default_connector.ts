/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { useKibana } from './use_kibana';
import { useLoadConnectors } from './use_load_connectors';

/**
 * Client-side logic to determine the default connector from available connectors
 * This matches the server-side logic in the inference plugin
 */
const getDefaultConnectorFromList = (connectors: any[]): InferenceConnector | undefined => {
  if (!connectors || connectors.length === 0) {
    return undefined;
  }

  // Convert AIConnector to InferenceConnector format
  const inferenceConnectors: InferenceConnector[] = connectors.map((connector) => ({
    connectorId: connector.id,
    type: getConnectorType(connector.actionTypeId),
    name: connector.name,
    config: connector.config || {},
    capabilities: connector.capabilities || {},
  }));

  // Find Inference connector first (highest priority)
  const inferenceConnector = inferenceConnectors.find(
    (connector) => connector.type === InferenceConnectorType.Inference
  );
  if (inferenceConnector) {
    return inferenceConnector;
  }

  // Find OpenAI connector second
  const openAIConnector = inferenceConnectors.find(
    (connector) => connector.type === InferenceConnectorType.OpenAI
  );
  if (openAIConnector) {
    return openAIConnector;
  }

  // Return the first available connector as fallback
  return inferenceConnectors[0];
};

/**
 * Maps action type IDs to InferenceConnectorType
 */
const getConnectorType = (actionTypeId: string): InferenceConnectorType => {
  switch (actionTypeId) {
    case '.inference':
      return InferenceConnectorType.Inference;
    case '.gen-ai':
      return InferenceConnectorType.OpenAI;
    case '.bedrock':
      return InferenceConnectorType.Bedrock;
    case '.gemini':
      return InferenceConnectorType.Gemini;
    default:
      return InferenceConnectorType.OpenAI; // Default fallback
  }
};

export const useDefaultConnector = () => {
  const { services } = useKibana();
  const {
    http,
    notifications: { toasts },
  } = services;

  const { data: aiConnectors, isLoading, error } = useLoadConnectors({ http, toasts });

  const defaultConnector = useMemo(() => {
    if (!aiConnectors) {
      return undefined;
    }
    return getDefaultConnectorFromList(aiConnectors);
  }, [aiConnectors]);

  return {
    data: defaultConnector,
    isLoading,
    error,
  };
};
