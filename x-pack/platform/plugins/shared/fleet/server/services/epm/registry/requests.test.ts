/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { securityMock } from '@kbn/security-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';

import type { Logger } from '@kbn/core/server';

import { RegistryError, RegistryConnectionError, RegistryResponseError } from '../../../errors';
import { appContextService } from '../../app_context';

import { categorizeRegistryConnectionError, fetchUrl, getResponse } from './requests';
jest.mock('node-fetch');
jest.mock('../../app_context');

let mockRegistryProxyUrl: string | undefined;
jest.mock('./proxy', () => ({
  getProxyAgent: jest.fn().mockReturnValue('proxy agent'),
  getRegistryProxyUrl: () => mockRegistryProxyUrl,
}));

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

const { Response, FetchError } = jest.requireActual('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;

jest.setTimeout(120 * 1000);

describe('Registry requests', () => {
  beforeEach(async () => {});

  afterEach(async () => {
    jest.clearAllMocks();
  });
  let mockedLogger: jest.Mocked<Logger>;

  describe('fetch options', () => {
    beforeEach(() => {
      fetchMock.mockImplementationOnce(() => Promise.resolve(new Response('')));
      mockedAppContextService.getKibanaVersion.mockReturnValue('8.0.0');
      mockedLogger = loggerMock.create();
      mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
    });

    it('should set User-Agent header including kibana version', async () => {
      await getResponse('');

      expect(fetchMock).toHaveBeenCalledWith('', {
        headers: {
          'User-Agent': 'Kibana/8.0.0 node-fetch',
        },
      });
    });

    it('should set User-Agent header including kibana version with agent', async () => {
      mockRegistryProxyUrl = 'url';

      await getResponse('');

      expect(fetchMock).toHaveBeenCalledWith('', {
        agent: 'proxy agent',
        headers: {
          'User-Agent': 'Kibana/8.0.0 node-fetch',
        },
      });
    });
  });

  describe('categorizeRegistryConnectionError', () => {
    it.each([
      ['ETIMEDOUT', 'timeout'],
      ['ESOCKETTIMEDOUT', 'timeout'],
      ['ECONNABORTED', 'timeout'],
      ['ENOTFOUND', 'dns'],
      ['EAI_AGAIN', 'dns'],
      ['ECONNREFUSED', 'connection'],
      ['ECONNRESET', 'connection'],
      ['EHOSTUNREACH', 'connection'],
      ['ENETUNREACH', 'connection'],
      ['EPIPE', 'connection'],
      ['EPROTO', 'connection'],
      ['ESOMETHING', 'unknown'],
    ])('maps code %s to type "%s"', (code, type) => {
      const error = new FetchError('message', 'system', { code });
      expect(categorizeRegistryConnectionError(error)).toEqual({ type, reason: code });
    });

    it('returns type "unknown" with no reason when there is no code', () => {
      const error = new FetchError('message', 'system');
      expect(categorizeRegistryConnectionError(error)).toEqual({ type: 'unknown' });
    });

    it('returns type "unknown" with no reason for a non-fetch error', () => {
      expect(categorizeRegistryConnectionError(new Error('boom'))).toEqual({ type: 'unknown' });
    });
  });

  describe('fetchUrl / getResponse errors', () => {
    it('regular Errors do not retry. Becomes RegistryError', async () => {
      fetchMock.mockImplementationOnce(() => {
        throw new Error('mocked');
      });
      const promise = fetchUrl('');
      await expect(promise).rejects.toThrow(RegistryError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('TypeErrors do not retry. Becomes RegistryError', async () => {
      fetchMock.mockImplementationOnce(() => {
        // @ts-expect-error
        null.f();
      });
      const promise = fetchUrl('');
      await expect(promise).rejects.toThrow(RegistryError);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    describe('only system errors retry (like ECONNRESET)', () => {
      it('they eventually succeed', async () => {
        const successValue = JSON.stringify({ name: 'attempt 4 works', version: '1.2.3' });
        fetchMock
          .mockImplementationOnce(() => {
            throw new FetchError('message 1', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 2', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 3', 'system', { code: 'ESOMETHING' });
          })
          // this one succeeds
          .mockImplementationOnce(() => Promise.resolve(new Response(successValue)));

        const promise = fetchUrl('');
        await expect(promise).resolves.toEqual(successValue);
        // doesn't retry after success
        expect(fetchMock).toHaveBeenCalledTimes(4);
        const actualResultsOrder = fetchMock.mock.results.map(({ type }: { type: string }) => type);
        expect(actualResultsOrder).toEqual(['throw', 'throw', 'throw', 'return']);
      });

      it('or error after 1 failure & 5 retries with RegistryConnectionError', async () => {
        fetchMock
          .mockImplementationOnce(() => {
            throw new FetchError('message 1', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 2', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 3', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 4', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 5', 'system', { code: 'ESOMETHING' });
          })
          .mockImplementationOnce(() => {
            throw new FetchError('message 6', 'system', { code: 'ESOMETHING' });
          });

        const promise = fetchUrl('');
        await expect(promise).rejects.toThrow(RegistryConnectionError);
        // doesn't retry after 1 failure & 5 failed retries
        expect(fetchMock).toHaveBeenCalledTimes(6);
        const actualResultsOrder = fetchMock.mock.results.map(({ type }: { type: string }) => type);
        expect(actualResultsOrder).toEqual(['throw', 'throw', 'throw', 'throw', 'throw', 'throw']);
      });
    });

    describe('RegistryConnectionError categorization', () => {
      // Use retries=0 to avoid exponential backoff; a single system error is enough to
      // exercise the categorization path.
      it.each([
        ['ENOTFOUND', 'dns'],
        ['EAI_AGAIN', 'dns'],
        ['ETIMEDOUT', 'timeout'],
        ['ECONNREFUSED', 'connection'],
        ['ECONNRESET', 'connection'],
        ['EPROTO', 'connection'],
        ['ESOMETHING', 'unknown'],
      ])('categorizes %s as type "%s" and surfaces it in error attributes', async (code, type) => {
        fetchMock.mockImplementationOnce(() => {
          throw new FetchError(`message for ${code}`, 'system', { code });
        });

        const promise = getResponse('', 0);
        await expect(promise).rejects.toThrow(RegistryConnectionError);
        await expect(promise).rejects.toMatchObject({
          attributes: { type, reason: code },
        });
      });

      it('categorizes a system error without a code as "unknown" with no reason', async () => {
        fetchMock.mockImplementationOnce(() => {
          throw new FetchError('no code', 'system');
        });

        const promise = getResponse('', 0);
        await expect(promise).rejects.toThrow(RegistryConnectionError);
        await expect(promise).rejects.toMatchObject({
          attributes: { type: 'unknown' },
        });
      });
    });

    describe('4xx or 5xx from Registry become RegistryResponseError', () => {
      it('404', async () => {
        fetchMock.mockImplementationOnce(() => ({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          url: 'https://example.com',
        }));
        const promise = fetchUrl('');
        await expect(promise).rejects.toThrow(RegistryResponseError);
        await expect(promise).rejects.toThrow(
          `'404 Not Found' error response from package registry at https://example.com`
        );
        await expect(promise).rejects.toMatchObject({ status: 404 });
        await expect(promise).rejects.toMatchObject({
          attributes: { type: 'http', reason: '404' },
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('429', async () => {
        fetchMock.mockImplementationOnce(() => ({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          url: 'https://example.com',
        }));
        const promise = fetchUrl('');
        await expect(promise).rejects.toThrow(RegistryResponseError);
        await expect(promise).rejects.toThrow(
          `'429 Too Many Requests' error response from package registry at https://example.com`
        );
        await expect(promise).rejects.toMatchObject({ status: 429 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('500', async () => {
        fetchMock.mockImplementation(() => ({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          url: 'https://example.com',
        }));
        const promise = fetchUrl('');
        await expect(promise).rejects.toThrow(RegistryResponseError);
        await expect(promise).rejects.toThrow(
          `'500 Internal Server Error' error response from package registry at https://example.com`
        );
        await expect(promise).rejects.toMatchObject({ status: 500 });
        expect(fetchMock).toHaveBeenCalledTimes(6);
      });
    });

    describe('url in RegistryResponseError message is response.url || requested_url', () => {
      it('given response.url, use that', async () => {
        fetchMock.mockImplementationOnce(() => ({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          url: 'https://example.com/?from_response=true',
        }));
        const promise = fetchUrl('https://example.com/?requested=true');
        await expect(promise).rejects.toThrow(RegistryResponseError);
        await expect(promise).rejects.toThrow(
          `'404 Not Found' error response from package registry at https://example.com/?from_response=true`
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('no response.url, use requested url', async () => {
        fetchMock.mockImplementationOnce(() => ({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        }));
        const promise = fetchUrl('https://example.com/?requested=true');
        await expect(promise).rejects.toThrow(RegistryResponseError);
        await expect(promise).rejects.toThrow(
          `'404 Not Found' error response from package registry at https://example.com/?requested=true`
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });
    });

    describe('with config.isAirGapped == true', () => {
      beforeEach(() => {
        mockedLogger = loggerMock.create();
        mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
        mockedAppContextService.getConfig.mockReturnValue({
          isAirGapped: true,
          enabled: true,
          agents: { enabled: true, elasticsearch: {} },
        });
      });

      it('should not call fetch', async () => {
        await getResponse('');

        expect(fetchMock).toHaveBeenCalledTimes(0);
      });

      it('fetchUrl throws error', async () => {
        fetchMock.mockImplementationOnce(() => {
          throw new Error('mocked');
        });
        const promise = fetchUrl('');
        await expect(promise).rejects.toThrow(RegistryResponseError);
        expect(fetchMock).toHaveBeenCalledTimes(0);
      });
    });
  });
});
