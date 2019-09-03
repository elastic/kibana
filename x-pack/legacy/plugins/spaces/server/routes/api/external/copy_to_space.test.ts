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

describe('POST /api/spaces/_copy_saved_objects', () => {
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

    const { response } = await request('POST', '/api/spaces/_copy_saved_objects', {
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

  test(`uses a Saved Objects Client instance without the spaces wrapper`, async () => {
    const payload = {
      spaces: ['a-space'],
      objects: [],
    };

    const { mockSavedObjectsService } = await request('POST', '/api/spaces/_copy_saved_objects', {
      expectSpacesClientCall: false,
      payload,
    });

    expect(mockSavedObjectsService.getScopedSavedObjectsClient).toHaveBeenCalledWith(
      expect.any(Object),
      {
        excludedWrappers: ['spaces'],
      }
    );
  });

  test(`requires space IDs to be unique`, async () => {
    const payload = {
      spaces: ['a-space', 'a-space'],
      objects: [],
    };

    const { response } = await request('POST', '/api/spaces/_copy_saved_objects', {
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

  test(`requires well-formed space IDS`, async () => {
    const payload = {
      spaces: ['a-space', 'a-space-invalid-!@#$%^&*()'],
      objects: [],
    };

    const { response } = await request('POST', '/api/spaces/_copy_saved_objects', {
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

    const { response } = await request('POST', '/api/spaces/_copy_saved_objects', {
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
      '/api/spaces/_copy_saved_objects',
      {
        expectSpacesClientCall: false,
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
      '/api/spaces/_copy_saved_objects',
      {
        expectSpacesClientCall: false,
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

describe('POST /api/spaces/_resolve_copy_saved_objects_errors', () => {
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
      retries: {},
      objects: [],
    };

    const { response } = await request('POST', '/api/spaces/_resolve_copy_saved_objects_errors', {
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

  test(`uses a Saved Objects Client instance without the spaces wrapper`, async () => {
    const payload = {
      retries: {
        ['a-space']: [
          {
            type: 'visualization',
            id: 'bar',
            overwrite: true,
          },
        ],
      },
      objects: [{ type: 'visualization', id: 'bar' }],
    };

    const { mockSavedObjectsService } = await request(
      'POST',
      '/api/spaces/_resolve_copy_saved_objects_errors',
      {
        expectSpacesClientCall: false,
        payload,
      }
    );

    expect(mockSavedObjectsService.getScopedSavedObjectsClient).toHaveBeenCalledWith(
      expect.any(Object),
      {
        excludedWrappers: ['spaces'],
      }
    );
  });

  test(`requires objects to be unique`, async () => {
    const payload = {
      retries: {},
      objects: [{ type: 'foo', id: 'bar' }, { type: 'foo', id: 'bar' }],
    };

    const { response } = await request('POST', '/api/spaces/_resolve_copy_saved_objects_errors', {
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

  test(`requires well-formed space ids`, async () => {
    const payload = {
      retries: {
        ['invalid-space-id!@#$%^&*()']: [
          {
            type: 'foo',
            id: 'bar',
            overwrite: true,
          },
        ],
      },
      objects: [{ type: 'foo', id: 'bar' }],
    };

    const { response } = await request('POST', '/api/spaces/_resolve_copy_saved_objects_errors', {
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
      retries: {
        ['a-space']: [
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
      '/api/spaces/_resolve_copy_saved_objects_errors',
      {
        expectSpacesClientCall: false,
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
      retries: {
        ['a-space']: [
          {
            type: 'visualization',
            id: 'bar',
            overwrite: true,
          },
        ],
        ['b-space']: [
          {
            type: 'globalType',
            id: 'bar',
            overwrite: true,
          },
        ],
      },
    };

    const { response, mockSavedObjectsService } = await request(
      'POST',
      '/api/spaces/_resolve_copy_saved_objects_errors',
      {
        expectSpacesClientCall: false,
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
