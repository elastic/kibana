/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { createApiLogic } from '../api_logic/create_api_logic';

export interface ConvertConnectorApiLogicArgs {
  connectorId: string;
  http?: HttpSetup;
}

export interface ConvertConnectorApiLogicResponse {
  updated: boolean;
}

export const convertConnector = async ({
  connectorId,
  http,
}: ConvertConnectorApiLogicArgs): Promise<ConvertConnectorApiLogicResponse | undefined> => {
  const route = `/internal/content_connectors/connectors/${connectorId}/native`;

  return await http?.put<{ updated: boolean }>(route, {
    body: JSON.stringify({ is_native: false }),
  });
};

export const ConvertConnectorApiLogic = createApiLogic(
  ['convert_connector_api_logic'],
  convertConnector
);
