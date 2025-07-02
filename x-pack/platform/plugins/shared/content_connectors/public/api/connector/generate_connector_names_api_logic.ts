/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface GenerateConnectorNamesApiArgs {
  connectorName?: string;
  connectorType?: string;
  isManagedConnector?: boolean;
  http?: HttpSetup;
}

export interface GenerateConnectorNamesApiResponse {
  apiKeyName: string;
  connectorName: string;
  indexName: string;
}

export const generateConnectorNames = async (
  { connectorType, connectorName, isManagedConnector, http }: GenerateConnectorNamesApiArgs = {
    connectorType: 'custom',
  }
) => {
  if (connectorType === '') {
    connectorType = 'custom';
  }
  const route = `/internal/content_connectors/connectors/generate_connector_name`;
  return await http?.post(route, {
    body: JSON.stringify({ connectorName, connectorType, isManagedConnector }),
  });
};

export const GenerateConnectorNamesApiLogic = createApiLogic(
  ['generate_connector_names_api_logic'],
  generateConnectorNames
);

export type GenerateConnectorNamesApiLogicActions = Actions<
  GenerateConnectorNamesApiArgs,
  GenerateConnectorNamesApiResponse
>;
