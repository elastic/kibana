/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { alertsClientMock } from '../../alert_data_client/alerts_client.mock';
import type { RacRequestHandlerContext } from '../../types';

const createMockClients = () => ({
  rac: alertsClientMock.create(),
  newClusterClient: elasticsearchClientMock.createScopedClusterClient(),
  savedObjectsClient: savedObjectsClientMock.create(),
});

const createRequestContextMock = (
  clients: ReturnType<typeof createMockClients> = createMockClients()
) => {
  const coreContext = coreMock.createRequestHandlerContext();
  return {
    rac: { getAlertsClient: jest.fn(() => clients.rac) },
    core: {
      ...coreContext,
      elasticsearch: {
        ...coreContext.elasticsearch,
        client: clients.newClusterClient,
      },
      savedObjects: { client: clients.savedObjectsClient },
    },
  } as unknown as RacRequestHandlerContext;
};

const createTools = () => {
  const clients = createMockClients();
  const context = createRequestContextMock(clients);

  return { clients, context };
};

export const requestContextMock = {
  create: createRequestContextMock,
  createMockClients,
  createTools,
};
