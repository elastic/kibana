/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { InferenceConnector, InferenceConnectorType } from '@kbn/inference-common';
import { getConnectorList } from './get_connector_list';

export const loadDefaultConnector = async ({
  actions,
  request,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
}): Promise<InferenceConnector> => {
  const connectors = await getConnectorList({ actions, request });
  return getDefaultConnector({ connectors });
};

export const getDefaultConnector = ({
  connectors,
}: {
  connectors: InferenceConnector[];
}): InferenceConnector => {
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
