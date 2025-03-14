/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient, ActionResult as ActionConnector } from '@kbn/actions-plugin/server';
import { createInferenceRequestError } from '@kbn/inference-common';
import {
  isSupportedConnectorType,
  type InferenceConnector,
  InferenceConnectorType,
} from '@kbn/inference-common';

/**
 * Retrieves a connector given the provided `connectorId` and asserts it's an inference connector
 */
export const getConnectors = async ({
  actionsClient,
}: {
  actionsClient: ActionsClient;
}): Promise<InferenceConnector[]> => {
  let connectors: ActionConnector[];
  try {
    connectors = await actionsClient.getAll({
      includeSystemActions: false,
    });
  } catch (error) {
    throw createInferenceRequestError(`Could not fetch connectors`, 500);
  }

  const supportedConnectors = connectors.filter((connector) =>
    isSupportedConnectorType(connector.actionTypeId)
  );

  return supportedConnectors.map((connector): InferenceConnector => {
    return {
      config: connector.config ?? {},
      connectorId: connector.id,
      name: connector.name,
      type: connector.actionTypeId as InferenceConnectorType,
    };
  });
};
