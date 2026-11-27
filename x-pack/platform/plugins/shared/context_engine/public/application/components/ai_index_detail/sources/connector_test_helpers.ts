/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@kbn/react-query';
import { contextEngineQueryKeys } from '../../../hooks/query_keys';

export const getHttpPath = (pathOrOptions: string | { path: string }): string =>
  typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;

export const CONNECTOR_TYPE_IDS = {
  googleDrive: '.google_drive',
  github: '.github',
  notion: '.notion',
} as const;

export interface MockRawConnector {
  id: string;
  name: string;
  connector_type_id: string;
}

export interface MockSupportedConnectorType {
  id: string;
  name: string;
  supported_feature_ids: string[];
}

export const MOCK_RAW_CONNECTORS: MockRawConnector[] = [
  {
    id: 'connector-gdrive',
    name: 'Google Drive',
    connector_type_id: CONNECTOR_TYPE_IDS.googleDrive,
  },
  {
    id: 'connector-github',
    name: 'GitHub',
    connector_type_id: CONNECTOR_TYPE_IDS.github,
  },
  {
    id: 'connector-notion',
    name: 'Notion',
    connector_type_id: CONNECTOR_TYPE_IDS.notion,
  },
];

export const MOCK_SUPPORTED_CONNECTOR_TYPES: MockSupportedConnectorType[] = [
  {
    id: CONNECTOR_TYPE_IDS.googleDrive,
    name: 'Google Drive',
    supported_feature_ids: ['contextEngine'],
  },
  {
    id: CONNECTOR_TYPE_IDS.github,
    name: 'GitHub',
    supported_feature_ids: ['contextEngine'],
  },
  {
    id: CONNECTOR_TYPE_IDS.notion,
    name: 'Notion',
    supported_feature_ids: ['contextEngine'],
  },
];

export interface ConnectorHttpMockOptions {
  connectorsResponse?: MockRawConnector[] | Error;
  typesResponse?: MockSupportedConnectorType[] | Error;
}

export const createConnectorHttpGetMock =
  ({
    connectorsResponse = MOCK_RAW_CONNECTORS,
    typesResponse = MOCK_SUPPORTED_CONNECTOR_TYPES,
  }: ConnectorHttpMockOptions = {}) =>
  (pathOrOptions: string | { path: string }) => {
    const path = getHttpPath(pathOrOptions);
    if (path === '/api/actions/connector_types') {
      if (typesResponse instanceof Error) {
        return Promise.reject(typesResponse);
      }
      return Promise.resolve(typesResponse);
    }
    if (path === '/api/actions/connectors') {
      if (connectorsResponse instanceof Error) {
        return Promise.reject(connectorsResponse);
      }
      return Promise.resolve(connectorsResponse);
    }
    return Promise.resolve(undefined);
  };

export const expectConnectorQueriesLoaded = (queryClient: QueryClient): void => {
  const typesQuery = queryClient.getQueryState(contextEngineQueryKeys.connectors.types());
  const listQuery = queryClient.getQueryState(contextEngineQueryKeys.connectors.list());
  expect(typesQuery?.status).toBe('success');
  expect(listQuery?.status).toBe('success');
};
