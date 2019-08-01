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
import { initCopyToSpacesApi } from './copy_to_space';

describe('POST /api/spaces/copySavedObjects', () => {
  let request: RequestRunner;
  let teardowns: TeardownFn[];

  beforeEach(() => {
    const setup = createTestHandler(initCopyToSpacesApi);

    request = setup.request;
    teardowns = setup.teardowns;
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  test(`returns result of routePreCheckLicense`, async () => {
    const payload = {
      spaces: ['a-space'],
      objects: [],
    };

    const { response } = await request('POST', '/api/spaces/copySavedObjects', {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      expectSpacesClientCall: false,
      payload,
    });

    const { statusCode, payload: responsePayload } = response;

    expect(statusCode).toEqual(403);
    expect(JSON.parse(responsePayload)).toMatchObject({
      message: 'test forbidden message',
    });
  });

  test(`requires space IDs to be unique`, async () => {
    const payload = {
      spaces: ['a-space', 'a-space'],
      objects: [],
    };

    const { response } = await request('POST', '/api/spaces/copySavedObjects', {
      expectSpacesClientCall: false,
      expectPreCheckLicenseCall: false,
      payload,
    });

    const { statusCode, payload: responsePayload } = response;

    expect(statusCode).toEqual(400);
    expect(JSON.parse(responsePayload)).toMatchInlineSnapshot(`
                  Object {
                    "error": "Bad Request",
                    "message": "Invalid request payload input",
                    "statusCode": 400,
                  }
            `);
  });

  test(`requires objects to be unique`, async () => {
    const payload = {
      spaces: ['a-space'],
      objects: [{ type: 'foo', id: 'bar' }, { type: 'foo', id: 'bar' }],
    };

    const { response } = await request('POST', '/api/spaces/copySavedObjects', {
      expectSpacesClientCall: false,
      expectPreCheckLicenseCall: false,
      payload,
    });

    const { statusCode, payload: responsePayload } = response;

    expect(statusCode).toEqual(400);
    expect(JSON.parse(responsePayload)).toMatchInlineSnapshot(`
                  Object {
                    "error": "Bad Request",
                    "message": "Invalid request payload input",
                    "statusCode": 400,
                  }
            `);
  });

  test('does not allow namespace agnostic types to be copied (via "supportedTypes" property)', async () => {
    const payload = {
      spaces: ['a-space'],
      objects: [{ type: 'globalType', id: 'bar' }, { type: 'visualization', id: 'bar' }],
    };

    const { response, mockSavedObjectsService } = await request(
      'POST',
      '/api/spaces/copySavedObjects',
      {
        payload,
      }
    );

    const { statusCode } = response;

    expect(statusCode).toEqual(200);
    expect(mockSavedObjectsService.importExport.importSavedObjects).toHaveBeenCalledTimes(1);
    const [
      importCallOptions,
    ] = mockSavedObjectsService.importExport.importSavedObjects.mock.calls[0];

    expect(importCallOptions).toMatchObject({
      namespace: 'a-space',
      supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
    });
  });

  test('copies to multiple spaces', async () => {
    const payload = {
      spaces: ['a-space', 'b-space'],
      objects: [{ type: 'visualization', id: 'bar' }],
    };

    const { response, mockSavedObjectsService } = await request(
      'POST',
      '/api/spaces/copySavedObjects',
      {
        payload,
      }
    );

    const { statusCode } = response;

    expect(statusCode).toEqual(200);
    expect(mockSavedObjectsService.importExport.importSavedObjects).toHaveBeenCalledTimes(2);
    const [
      firstImportCallOptions,
    ] = mockSavedObjectsService.importExport.importSavedObjects.mock.calls[0];

    expect(firstImportCallOptions).toMatchObject({
      namespace: 'a-space',
    });

    const [
      secondImportCallOptions,
    ] = mockSavedObjectsService.importExport.importSavedObjects.mock.calls[1];

    expect(secondImportCallOptions).toMatchObject({
      namespace: 'b-space',
    });
  });
});

describe('POST /api/spaces/copySavedObjects/resolveConflicts', () => {
  let request: RequestRunner;
  let teardowns: TeardownFn[];

  beforeEach(() => {
    const setup = createTestHandler(initCopyToSpacesApi);

    request = setup.request;
    teardowns = setup.teardowns;
  });

  afterEach(async () => {
    await Promise.all(teardowns.splice(0).map(fn => fn()));
  });

  test(`returns result of routePreCheckLicense`, async () => {
    const payload = {
      retries: [],
      objects: [],
    };

    const { response } = await request('POST', '/api/spaces/copySavedObjects/resolveConflicts', {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      expectSpacesClientCall: false,
      payload,
    });

    const { statusCode, payload: responsePayload } = response;

    expect(statusCode).toEqual(403);
    expect(JSON.parse(responsePayload)).toMatchObject({
      message: 'test forbidden message',
    });
  });

  test(`requires objects to be unique`, async () => {
    const payload = {
      spaces: ['a-space'],
      objects: [{ type: 'foo', id: 'bar' }, { type: 'foo', id: 'bar' }],
    };

    const { response } = await request('POST', '/api/spaces/copySavedObjects/resolveConflicts', {
      expectSpacesClientCall: false,
      expectPreCheckLicenseCall: false,
      payload,
    });

    const { statusCode, payload: responsePayload } = response;

    expect(statusCode).toEqual(400);
    expect(JSON.parse(responsePayload)).toMatchInlineSnapshot(`
                  Object {
                    "error": "Bad Request",
                    "message": "Invalid request payload input",
                    "statusCode": 400,
                  }
            `);
  });

  test('does not allow namespace agnostic types to be copied (via "supportedTypes" property)', async () => {
    const payload = {
      retries: [
        {
          space: 'a-space',
          retries: [
            {
              type: 'visualization',
              id: 'bar',
              overwrite: true,
            },
            {
              type: 'globalType',
              id: 'bar',
              overwrite: true,
            },
          ],
        },
      ],
      objects: [
        {
          type: 'globalType',
          id: 'bar',
        },
        { type: 'visualization', id: 'bar' },
      ],
    };

    const { response, mockSavedObjectsService } = await request(
      'POST',
      '/api/spaces/copySavedObjects/resolveConflicts',
      {
        payload,
      }
    );

    const { statusCode } = response;

    expect(statusCode).toEqual(200);
    expect(mockSavedObjectsService.importExport.resolveImportErrors).toHaveBeenCalledTimes(1);
    const [
      resolveImportErrorsCallOptions,
    ] = mockSavedObjectsService.importExport.resolveImportErrors.mock.calls[0];

    expect(resolveImportErrorsCallOptions).toMatchObject({
      namespace: 'a-space',
      supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
    });
  });

  test('resolves conflicts for multiple spaces', async () => {
    const payload = {
      objects: [{ type: 'visualization', id: 'bar' }],
      retries: [
        {
          space: 'a-space',
          retries: [
            {
              type: 'visualization',
              id: 'bar',
            },
          ],
        },
        {
          space: 'b-space',
          retries: [
            {
              type: 'visualization',
              id: 'bar',
            },
          ],
        },
      ],
    };

    const { response, mockSavedObjectsService } = await request(
      'POST',
      '/api/spaces/copySavedObjects/resolveConflicts',
      {
        payload,
      }
    );

    const { statusCode } = response;

    expect(statusCode).toEqual(200);
    expect(mockSavedObjectsService.importExport.resolveImportErrors).toHaveBeenCalledTimes(2);
    const [
      resolveImportErrorsFirstCallOptions,
    ] = mockSavedObjectsService.importExport.resolveImportErrors.mock.calls[0];

    expect(resolveImportErrorsFirstCallOptions).toMatchObject({
      namespace: 'a-space',
      supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
    });

    const [
      resolveImportErrorsSecondCallOptions,
    ] = mockSavedObjectsService.importExport.resolveImportErrors.mock.calls[1];

    expect(resolveImportErrorsSecondCallOptions).toMatchObject({
      namespace: 'b-space',
      supportedTypes: ['visualization', 'dashboard', 'index-pattern'],
    });
  });
});
