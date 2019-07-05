/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../lib/route_pre_check_license', () => {
  return {
    routePreCheckLicense: () => (request: any, h: any) => h.continue,
  };
});

jest.mock('../../../../../../server/lib/get_client_shield', () => {
  return {
    getClient: () => {
      return {
        callWithInternalUser: jest.fn(() => {
          return;
        }),
      };
    },
  };
});

import Boom from 'boom';
import { createTestHandler, RequestRunner, TeardownFn } from '../__fixtures__';
import { initInternalSpacesApi } from './spaces';

describe('Spaces API', () => {
  let request: RequestRunner;
  let teardowns: TeardownFn[];

  beforeEach(() => {
    const setup = createTestHandler(initInternalSpacesApi);

    request = setup.request;
    teardowns = setup.teardowns;
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  test('POST space/{id}/select should respond with the new space location', async () => {
    const { response } = await request('POST', '/api/spaces/v1/space/a-space/select');

    const { statusCode, payload } = response;

    expect(statusCode).toEqual(200);

    const result = JSON.parse(payload);
    expect(result.location).toEqual('/s/a-space');
  });

  test(`returns result of routePreCheckLicense`, async () => {
    const { response } = await request('POST', '/api/spaces/v1/space/a-space/select', {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      expectSpacesClientCall: false,
    });

    const { statusCode, payload } = response;

    expect(statusCode).toEqual(403);
    expect(JSON.parse(payload)).toMatchObject({
      message: 'test forbidden message',
    });
  });

  test('POST space/{id}/select should respond with 404 when the space is not found', async () => {
    const { response } = await request('POST', '/api/spaces/v1/space/not-a-space/select');

    const { statusCode } = response;

    expect(statusCode).toEqual(404);
  });

  test('POST space/{id}/select should respond with the new space location when a server.basePath is in use', async () => {
    const testConfig = {
      'server.basePath': '/my/base/path',
    };

    const { response } = await request('POST', '/api/spaces/v1/space/a-space/select', {
      testConfig,
    });

    const { statusCode, payload } = response;

    expect(statusCode).toEqual(200);

    const result = JSON.parse(payload);
    expect(result.location).toEqual('/my/base/path/s/a-space');
  });
});
