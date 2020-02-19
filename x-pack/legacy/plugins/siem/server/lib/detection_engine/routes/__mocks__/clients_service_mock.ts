/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../../../../../../src/core/server/mocks';
import { alertsClientMock } from '../../../../../../../../plugins/alerting/server/mocks';
import { ActionsClient } from '../../../../../../../../plugins/actions/server';
import { actionsClientMock } from '../../../../../../../../plugins/actions/server/mocks';
import { GetScopedClients } from '../../../../services';

const createClients = () => ({
  actionsClient: actionsClientMock.create() as jest.Mocked<ActionsClient>,
  alertsClient: alertsClientMock.create(),
  clusterClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: savedObjectsClientMock.create(),
  spacesClient: { getSpaceId: jest.fn() },
});

const createGetScoped = () =>
  jest.fn(() => Promise.resolve(createClients()) as ReturnType<GetScopedClients>);

const createClientsServiceMock = () => {
  return {
    setup: jest.fn(),
    start: jest.fn(),
    createGetScoped,
  };
};

export const clientsServiceMock = {
  create: createClientsServiceMock,
  createGetScoped,
  createClients,
};
