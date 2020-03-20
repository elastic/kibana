/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from '../../../../../../../../../src/core/server';
import {
  coreMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../../../../../../src/core/server/mocks';
import { alertsClientMock } from '../../../../../../../../plugins/alerting/server/mocks';
import { actionsClientMock } from '../../../../../../../../plugins/actions/server/mocks';

const createMockClients = () => ({
  actionsClient: actionsClientMock.create(),
  alertsClient: alertsClientMock.create(),
  clusterClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: savedObjectsClientMock.create(),
  siemClient: { signalsIndex: 'mockSignalsIndex' },
});

const createRequestContextMock = (
  clients: ReturnType<typeof createMockClients> = createMockClients()
) => {
  const coreContext = coreMock.createRequestHandlerContext();
  return ({
    actions: { getActionsClient: jest.fn(() => clients.actionsClient) },
    alerting: { getAlertsClient: jest.fn(() => clients.alertsClient) },
    core: {
      ...coreContext,
      elasticsearch: { ...coreContext.elasticsearch, dataClient: clients.clusterClient },
      savedObjects: { client: clients.savedObjectsClient },
    },
    siem: { getSiemClient: jest.fn(() => clients.siemClient) },
  } as unknown) as RequestHandlerContext;
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
