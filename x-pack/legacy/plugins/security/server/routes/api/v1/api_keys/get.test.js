/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Hapi from 'hapi';
import Boom from 'boom';

import { initGetApiKeysApi } from './get';
import { INTERNAL_API_BASE_PATH } from '../../../../../common/constants';

const createMockServer = () => new Hapi.Server({ debug: false, port: 8080 });

describe('GET API keys', () => {
  const getApiKeysTest = (
    description,
    {
      preCheckLicenseImpl = () => null,
      callWithRequestImpl,
      asserts,
      isAdmin = true,
    }
  ) => {
    test(description, async () => {
      const mockServer = createMockServer();
      const pre = jest.fn().mockImplementation(preCheckLicenseImpl);
      const mockCallWithRequest = jest.fn();

      if (callWithRequestImpl) {
        mockCallWithRequest.mockImplementation(callWithRequestImpl);
      }

      initGetApiKeysApi(mockServer, mockCallWithRequest, pre);

      const headers = {
        authorization: 'foo',
      };

      const request = {
        method: 'GET',
        url: `${INTERNAL_API_BASE_PATH}/api_key?isAdmin=${isAdmin}`,
        headers,
      };

      const { result, statusCode } = await mockServer.inject(request);

      expect(pre).toHaveBeenCalled();

      if (callWithRequestImpl) {
        expect(mockCallWithRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            headers: expect.objectContaining({
              authorization: headers.authorization,
            }),
          }),
          'shield.getAPIKeys',
          {
            owner: !isAdmin,
          },
        );
      } else {
        expect(mockCallWithRequest).not.toHaveBeenCalled();
      }

      expect(statusCode).toBe(asserts.statusCode);
      expect(result).toEqual(asserts.result);
    });
  };

  describe('failure', () => {
    getApiKeysTest('returns result of routePreCheckLicense', {
      preCheckLicenseImpl: () => Boom.forbidden('test forbidden message'),
      asserts: {
        statusCode: 403,
        result: {
          error: 'Forbidden',
          statusCode: 403,
          message: 'test forbidden message',
        },
      },
    });

    getApiKeysTest('returns error from callWithRequest', {
      callWithRequestImpl: async () => {
        throw Boom.notAcceptable('test not acceptable message');
      },
      asserts: {
        statusCode: 406,
        result: {
          error: 'Not Acceptable',
          statusCode: 406,
          message: 'test not acceptable message',
        },
      },
    });
  });

  describe('success', () => {
    getApiKeysTest('returns API keys', {
      callWithRequestImpl: async () => ({
        api_keys:
          [{
            id: 'YCLV7m0BJ3xI4hhWB648',
            name: 'test-api-key',
            creation: 1571670001452,
            expiration: 1571756401452,
            invalidated: false,
            username: 'elastic',
            realm: 'reserved'
          }]
      }),
      asserts: {
        statusCode: 200,
        result: {
          apiKeys:
            [{
              id: 'YCLV7m0BJ3xI4hhWB648',
              name: 'test-api-key',
              creation: 1571670001452,
              expiration: 1571756401452,
              invalidated: false,
              username: 'elastic',
              realm: 'reserved'
            }]
        },
      },
    });
    getApiKeysTest('returns only valid API keys', {
      callWithRequestImpl: async () => ({
        api_keys:
          [{
            id: 'YCLV7m0BJ3xI4hhWB648',
            name: 'test-api-key1',
            creation: 1571670001452,
            expiration: 1571756401452,
            invalidated: true,
            username: 'elastic',
            realm: 'reserved'
          }, {
            id: 'YCLV7m0BJ3xI4hhWB648',
            name: 'test-api-key2',
            creation: 1571670001452,
            expiration: 1571756401452,
            invalidated: false,
            username: 'elastic',
            realm: 'reserved'
          }],
      }),
      asserts: {
        statusCode: 200,
        result: {
          apiKeys:
            [{
              id: 'YCLV7m0BJ3xI4hhWB648',
              name: 'test-api-key2',
              creation: 1571670001452,
              expiration: 1571756401452,
              invalidated: false,
              username: 'elastic',
              realm: 'reserved'
            }]
        },
      },
    });
  });
});
