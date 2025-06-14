/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/search-connectors';
import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface FetchConnectorByIdApiLogicArgs {
  connectorId: string;
  http?: HttpSetup;
}
export interface FetchConnectorByIdApiLogicResponse {
  connector: Connector | undefined;
}

export const fetchConnectorById = async ({
  connectorId,
  http,
}: FetchConnectorByIdApiLogicArgs): Promise<FetchConnectorByIdApiLogicResponse | undefined> => {
  const route = `/internal/content_connectors/connectors/${connectorId}`;
  const response = await http?.get<FetchConnectorByIdApiLogicResponse>(route);
  return response;
};

export const FetchConnectorByIdApiLogic = createApiLogic(
  ['fetch_connector_by_id_api_logic'],
  fetchConnectorById
);

export type FetchConnectorByIdApiLogicActions = Actions<
  FetchConnectorByIdApiLogicArgs,
  FetchConnectorByIdApiLogicResponse
>;
