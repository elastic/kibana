/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';

// TODO: Import from gen-ai-settings-plugin (package) once available
const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

export const getDefaultConnector = ({
  connectors,
  defaultConnectorId,
}: {
  connectors: InferenceConnector[];
  defaultConnectorId?: string;
}): InferenceConnector => {
  if (defaultConnectorId && defaultConnectorId !== NO_DEFAULT_CONNECTOR) {
    const configuredConnector = connectors.find(
      (connector) => connector.connectorId === defaultConnectorId
    );
    if (configuredConnector) {
      return configuredConnector;
    }
  }

  const inferenceConnector = connectors.find(
    (connector) => connector.type === InferenceConnectorType.Inference
  );
  if (inferenceConnector) {
    return inferenceConnector;
  }

  const openAIConnector = connectors.find(
    (connector) => connector.type === InferenceConnectorType.OpenAI
  );
  if (openAIConnector) {
    return openAIConnector;
  }

  return connectors[0];
};
