/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from '../__mocks__/_mock_server';
import { getPrivilegeRequest, getMockPrivileges } from '../__mocks__/request_responses';
import { readPrivilegesRoute } from './read_privileges_route';
import * as myUtils from '../utils';

describe('read_privileges', () => {
  let { server, elasticsearch } = createMockServer();

  beforeEach(() => {
    jest.spyOn(myUtils, 'getIndex').mockReturnValue('fakeindex');
    ({ server, elasticsearch } = createMockServer());
    elasticsearch.getCluster = jest.fn(() => ({
      callWithRequest: jest.fn(() => getMockPrivileges()),
    }));
    readPrivilegesRoute(server);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('normal status codes', () => {
    test('returns 200 when doing a normal request', async () => {
      const { statusCode } = await server.inject(getPrivilegeRequest());
      expect(statusCode).toBe(200);
    });

    test('returns the payload when doing a normal request', async () => {
      const { payload } = await server.inject(getPrivilegeRequest());
      expect(JSON.parse(payload)).toEqual(getMockPrivileges());
    });
  });
});
