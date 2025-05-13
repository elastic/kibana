/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInferenceRequestError } from '../errors';
import type { InferenceConnector, RawConnector } from './connectors';
import { isSupportedConnector } from './is_supported_connector';

/**
 * Converts an action connector to the internal inference connector format.
 *
 * The function will throw if the provided connector is not compatible
 */
export const connectorToInference = (connector: RawConnector): InferenceConnector => {
  if (!isSupportedConnector(connector)) {
    throw createInferenceRequestError(
      `Connector '${connector.id}' of type '${connector.actionTypeId}' not recognized as a supported connector`,
      400
    );
  }

  return {
    connectorId: connector.id,
    name: connector.name,
    type: connector.actionTypeId,
    config: connector.config ?? {},
  };
};
