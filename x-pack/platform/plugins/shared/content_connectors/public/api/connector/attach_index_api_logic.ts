/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface AttachIndexApiLogicArgs {
  connectorId: string;
  indexName: string;
  http?: HttpSetup;
}

export interface AttachIndexApiLogicResponse {
  connectorId: string;
  indexName: string;
}

export const attachIndex = async ({
  connectorId,
  indexName,
  http,
}: AttachIndexApiLogicArgs): Promise<AttachIndexApiLogicResponse> => {
  const route = `/internal/content_connectors/connectors/${connectorId}/index_name/${indexName}`;

  await http?.put(route);
  return { connectorId, indexName };
};

export const AttachIndexApiLogic = createApiLogic(['add_connector_api_logic'], attachIndex);

export type AttachIndexApiLogicActions = Actions<AttachIndexApiLogicArgs, AttachIndexApiLogicArgs>;
