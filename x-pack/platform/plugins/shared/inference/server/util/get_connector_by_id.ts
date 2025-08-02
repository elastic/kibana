/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import { ConnectorWithExtraFindData } from '@kbn/actions-plugin/server/application/connector/types';
import {
  createInferenceRequestError,
  connectorToInference,
  type InferenceConnector,
} from '@kbn/inference-common';

/**
 * Retrieves a connector given the provided `connectorId` and asserts it's an inference connector
 */
export const getConnectorById = async ({
  connectorId,
  actionsClient,
}: {
  actionsClient: ActionsClient;
  connectorId: string;
}): Promise<InferenceConnector> => {
  let connectors: ConnectorWithExtraFindData[] | undefined;
  try {
    connectors = await actionsClient.getAll();
  } catch (error) {
    throw createInferenceRequestError(
      `An error occur fetching connectors for id '${connectorId}'\n${error.message}`,
      400
    );
  }
  const connector = (connectors ?? []).find((c) => c.id === connectorId);
  if (!connector) {
    throw createInferenceRequestError(`No connector found for id '${connectorId}'`, 400);
  }

  return connectorToInference(connector);
};
