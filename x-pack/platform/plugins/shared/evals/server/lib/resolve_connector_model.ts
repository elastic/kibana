/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { getConnectorModel, getConnectorFamily, getConnectorProvider } from '@kbn/inference-common';
import type { Model } from '@kbn/evals-common';

/**
 * Describes the model behind a connector for score attribution. Falls back to the
 * connector id as the model id when the connector cannot be read, so a lookup
 * failure degrades attribution rather than failing the evaluation.
 */
export const resolveConnectorModel = async ({
  connectorId,
  inference,
  request,
  logger,
}: {
  connectorId: string;
  inference: InferenceServerStart;
  request: KibanaRequest;
  logger: Pick<Logger, 'debug'>;
}): Promise<Model> => {
  try {
    const connector = await inference.getConnectorById(connectorId, request);
    return {
      id: getConnectorModel(connector) ?? connector.name,
      family: getConnectorFamily(connector),
      provider: getConnectorProvider(connector),
    };
  } catch (error) {
    logger.debug(
      `Could not resolve a model for connector "${connectorId}"; using the connector id as the model id: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return { id: connectorId };
  }
};
