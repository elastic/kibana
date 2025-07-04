/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface GenerateConfigApiArgs {
  connectorId: string;
  http?: HttpSetup;
}

export type GenerateConfigApiActions = Actions<GenerateConfigApiArgs, {}>;

export const generateConnectorConfig = async ({ connectorId, http }: GenerateConfigApiArgs) => {
  const route = `/internal/content_connectors/connectors/${connectorId}/generate_config`;
  return await http?.post(route);
};

export const GenerateConfigApiLogic = createApiLogic(
  ['generate_config_api_logic'],
  generateConnectorConfig
);
