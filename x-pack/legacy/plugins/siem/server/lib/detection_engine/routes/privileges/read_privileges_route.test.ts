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
  let { inject, services, callClusterMock } = createMockServer();

  beforeEach(() => {
    jest.spyOn(myUtils, 'getIndex').mockReturnValue('fakeindex');
    ({ inject, services, callClusterMock } = createMockServer());
    callClusterMock.mockImplementation(getMockPrivileges);
    readPrivilegesRoute(services);
  });

  afterEach(() => {
    jest.resetAllMocks();
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
