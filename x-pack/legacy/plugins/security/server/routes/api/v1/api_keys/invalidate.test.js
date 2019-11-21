/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Hapi from 'hapi';
import Boom from 'boom';

import { initInvalidateApiKeysApi } from './invalidate';
import { INTERNAL_API_BASE_PATH } from '../../../../../common/constants';

const createMockServer = () => new Hapi.Server({ debug: false, port: 8080 });

describe('POST invalidate', () => {
  const postInvalidateTest = (
    description,
    {
      preCheckLicenseImpl = () => null,
      callWithRequestImpls = [],
      asserts,
      payload,
    }
  ) => {
    test(description, async () => {
      const mockServer = createMockServer();
      const pre = jest.fn().mockImplementation(preCheckLicenseImpl);
      const mockCallWithRequest = jest.fn();

      for (const impl of callWithRequestImpls) {
        mockCallWithRequest.mockImplementationOnce(impl);
      }

      initInvalidateApiKeysApi(mockServer, mockCallWithRequest, pre);

      const headers = {
        authorization: 'foo',
      };

      const request = {
        method: 'POST',
        url: `${INTERNAL_API_BASE_PATH}/api_key/invalidate`,
        headers,
        payload,
      };

      const { result, statusCode } = await mockServer.inject(request);

      expect(pre).toHaveBeenCalled();

      if (asserts.callWithRequests) {
        for (const args of asserts.callWithRequests) {
          expect(mockCallWithRequest).toHaveBeenCalledWith(
            expect.objectContaining({
              headers: expect.objectContaining({
                authorization: headers.authorization,
              }),
            }),
            ...args
          );
        }
      } else {
        expect(mockCallWithRequest).not.toHaveBeenCalled();
      }

      expect(statusCode).toBe(asserts.statusCode);
      expect(result).toEqual(asserts.result);
    });
  };

  describe('failure', () => {
    postInvalidateTest('returns result of routePreCheckLicense', {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      payload: {
        apiKeys: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key' }],
        isAdmin: true
      },
      asserts: {
        statusCode: 403,
        result: {
          error: 'Forbidden',
          statusCode: 403,
          message: 'test forbidden message',
        },
      },
    });

    postInvalidateTest('returns errors array from callWithRequest', {
      callWithRequestImpls: [async () => {
        throw Boom.notAcceptable('test not acceptable message');
      }],
      payload: {
        apiKeys: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key', }],
        isAdmin: true
      },
      asserts: {
        callWithRequests: [
          ['shield.invalidateAPIKey', {
            body: {
              id: 'si8If24B1bKsmSLTAhJV',
            },
          }],
        ],
        statusCode: 200,
        result: {
          itemsInvalidated: [],
          errors: [{
            id: 'si8If24B1bKsmSLTAhJV',
            name: 'my-api-key',
            error: Boom.notAcceptable('test not acceptable message'),
          }]
        },
      },
    });
  });

  describe('success', () => {
    postInvalidateTest('invalidates API keys', {
      callWithRequestImpls: [async () => null],
      payload: {
        apiKeys: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key', }],
        isAdmin: true
      },
      asserts: {
        callWithRequests: [
          ['shield.invalidateAPIKey', {
            body: {
              id: 'si8If24B1bKsmSLTAhJV',
            },
          }],
        ],
        statusCode: 200,
        result: {
          itemsInvalidated: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key', }],
          errors: [],
        },
      },
    });

    postInvalidateTest('adds "owner" to body if isAdmin=false', {
      callWithRequestImpls: [async () => null],
      payload: {
        apiKeys: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key', }],
        isAdmin: false
      },
      asserts: {
        callWithRequests: [
          ['shield.invalidateAPIKey', {
            body: {
              id: 'si8If24B1bKsmSLTAhJV',
              owner: true,
            },
          }],
        ],
        statusCode: 200,
        result: {
          itemsInvalidated: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key' }],
          errors: [],
        },
      },
    });

    postInvalidateTest('returns only successful invalidation requests', {
      callWithRequestImpls: [
        async () => null,
        async () => {
          throw Boom.notAcceptable('test not acceptable message');
        }],
      payload: {
        apiKeys: [
          { id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key1' },
          { id: 'ab8If24B1bKsmSLTAhNC', name: 'my-api-key2' }
        ],
        isAdmin: true
      },
      asserts: {
        callWithRequests: [
          ['shield.invalidateAPIKey', {
            body: {
              id: 'si8If24B1bKsmSLTAhJV',
            },
          }],
          ['shield.invalidateAPIKey', {
            body: {
              id: 'ab8If24B1bKsmSLTAhNC',
            },
          }],
        ],
        statusCode: 200,
        result: {
          itemsInvalidated: [{ id: 'si8If24B1bKsmSLTAhJV', name: 'my-api-key1' }],
          errors: [{
            id: 'ab8If24B1bKsmSLTAhNC',
            name: 'my-api-key2',
            error: Boom.notAcceptable('test not acceptable message'),
          }]
        },
      },
    });
  });
});
