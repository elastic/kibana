/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readPrivilegesRoute } from './read_privileges_route';
import { serverMock, requestContextMock } from '../__mocks__';
import { getPrivilegeRequest, getMockPrivileges } from '../__mocks__/request_responses';

describe('read_privileges', () => {
  let { getRoute, router, response } = serverMock.create();
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    ({ getRoute, router, response } = serverMock.create());
    ({ clients, context } = requestContextMock.createTools());

    clients.clusterClient.callAsCurrentUser.mockResolvedValue(getMockPrivileges());
    readPrivilegesRoute(router, false);
  });

  describe('normal status codes', () => {
    test('returns 200 when doing a normal request', async () => {
      await getRoute().handler(context, getPrivilegeRequest(), response);
      expect(response.ok).toHaveBeenCalled();
    });

    test('returns the payload when doing a normal request', async () => {
      await getRoute().handler(context, getPrivilegeRequest(), response);
      expect(response.ok).toHaveBeenCalledWith({
        body: getMockPrivileges(),
      });
    });
  });
});
