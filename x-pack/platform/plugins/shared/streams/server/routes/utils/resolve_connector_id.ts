/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, Logger } from '@kbn/core/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import { StatusError } from '../../lib/streams/errors/status_error';

/**
 * Resolves the connector ID to use for AI operations.
 *
 * If a connectorId is provided, it will be used.
 * Otherwise, it will check the uiSettings for a default AI connector.
 * If no connector is found, it will throw an error.
 *
 * @param connectorId - Optional connector ID provided by the client
 * @param uiSettingsClient - UI settings client to fetch the default connector setting
 * @returns The resolved connector ID
 * @throws StatusError if no connector ID is provided and no default is configured
 */

// TODO: Import from gen-ai-settings-plugin (package) once available
const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

export async function resolveConnectorId({
  connectorId,
  uiSettingsClient,
  logger,
}: {
  connectorId?: string;
  uiSettingsClient: IUiSettingsClient;
  logger: Logger;
}): Promise<string> {
  if (connectorId) {
    return connectorId;
  }

  const defaultConnector = await uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);

  if (defaultConnector && defaultConnector !== NO_DEFAULT_CONNECTOR) {
    logger.debug(`No connector ID provided, using default AI connector: ${defaultConnector}`);
    return defaultConnector;
  }

  throw new StatusError(
    'No connector ID provided and no default AI connector configured. Please provide a connectorId or configure a default AI connector in settings.',
    400
  );
}
