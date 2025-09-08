/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionResult as ActionConnector } from '@kbn/actions-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
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
  actions,
  request,
}: {
  actions: ActionsPluginStart;
  request: KibanaRequest;
  connectorId: string;
}): Promise<InferenceConnector> => {
  let connector: ActionConnector;
  try {
    const actionsClient = await actions.getActionsClientWithRequest(request);
    connector = await actionsClient.get({
      id: connectorId,
      throwIfSystemAction: true,
    });
  } catch (error) {
    throw createInferenceRequestError(
      `No connector found for id '${connectorId}'\n${error.message}`,
      400
    );
  }

  return connectorToInference(connector);
};
