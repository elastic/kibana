/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '../../../../../../../../../src/core/server/mocks';
import { alertsClientMock } from '../../../../../../alerting/server/alerts_client.mock';
import { ActionsClient } from '../../../../../../../../plugins/actions/server';
import { actionsClientMock } from '../../../../../../../../plugins/actions/server/mocks';
import { GetScopedClients } from '../../../../services';

export const createMockClients = () => {
  const mockClients = {
    actionsClient: actionsClientMock.create() as jest.Mocked<ActionsClient>,
    alertsClient: alertsClientMock.create(),
    clusterClient: elasticsearchServiceMock.createScopedClusterClient(),
    savedObjectsClient: savedObjectsClientMock.create(),
    spacesClient: { getSpaceId: jest.fn() },
  };

  return {
    getClients: jest.fn(() => Promise.resolve(mockClients) as ReturnType<GetScopedClients>),
    clients: mockClients,
  };
};
