/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readPrivilegesRoute } from './read_privileges_route';
import { createMockServer, createMockConfig, clientsServiceMock } from '../__mocks__';
import { getPrivilegeRequest, getMockPrivileges } from '../__mocks__/request_responses';

describe('read_privileges', () => {
  let { route, inject } = createMockServer();
  let config = createMockConfig();
  let getClients = clientsServiceMock.createGetScoped();
  let clients = clientsServiceMock.createClients();

  beforeEach(() => {
    jest.resetAllMocks();
    ({ route, inject } = createMockServer());

    config = createMockConfig();
    getClients = clientsServiceMock.createGetScoped();
    clients = clientsServiceMock.createClients();

    getClients.mockResolvedValue(clients);
    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getMockPrivileges());

    readPrivilegesRoute(route, config, false, getClients);
  });

  describe('normal status codes', () => {
    test('returns 200 when doing a normal request', async () => {
      const { statusCode } = await inject(getPrivilegeRequest());
      expect(statusCode).toBe(200);
    });

    test('returns the payload when doing a normal request', async () => {
      const { payload } = await inject(getPrivilegeRequest());
      expect(JSON.parse(payload)).toEqual(getMockPrivileges());
    });
  });
});
