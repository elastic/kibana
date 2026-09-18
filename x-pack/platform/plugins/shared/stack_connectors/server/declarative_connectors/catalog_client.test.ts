/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  fetchCatalogText,
  MAX_CATALOG_BYTES,
  resolveAssetUrl,
  resolveRegistryUrl,
} from './catalog_client';
import { createFetchDouble } from './test_fixtures';

jest.mock('node-fetch');

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

const REGISTRY_URL = 'http://127.0.0.1:8089';

describe('catalog_client', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  describe('resolveRegistryUrl', () => {
    it('pins a relative path to the registry origin', () => {
      expect(resolveRegistryUrl(REGISTRY_URL, 'catalog.json')).toBe(
        'http://127.0.0.1:8089/catalog.json'
      );
    });

    it('accepts a same-origin absolute URL', () => {
      expect(resolveRegistryUrl(REGISTRY_URL, 'http://127.0.0.1:8089/catalog.json')).toBe(
        'http://127.0.0.1:8089/catalog.json'
      );
    });

    it('rejects a cross-origin absolute URL', () => {
      expect(() => resolveRegistryUrl(REGISTRY_URL, 'https://evil.example/catalog.json')).toThrow(
        'must remain on the registry origin'
      );
    });
  });

  describe('resolveAssetUrl', () => {
    it('resolves a relative icon against the definition URL', () => {
      expect(resolveAssetUrl(REGISTRY_URL, 'connectors/abuseipdb/1.1.0.yaml', '1.1.0.svg')).toBe(
        'http://127.0.0.1:8089/connectors/abuseipdb/1.1.0.svg'
      );
    });

    it('rejects a cross-origin icon URL', () => {
      expect(() =>
        resolveAssetUrl(
          REGISTRY_URL,
          'connectors/abuseipdb/1.1.0.yaml',
          'https://evil.example/x.svg'
        )
      ).toThrow('must remain on the registry origin');
    });
  });

  describe('fetchCatalogText', () => {
    it('fetches a relative path with timeout and size caps', async () => {
      mockedFetch.mockImplementation(
        createFetchDouble({
          '/catalog.json': { body: '{"ok":true}' },
        }) as unknown as typeof fetch
      );

      await expect(
        fetchCatalogText({
          registryUrl: REGISTRY_URL,
          path: 'catalog.json',
          maxBytes: MAX_CATALOG_BYTES,
          timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
        })
      ).resolves.toBe('{"ok":true}');

      expect(mockedFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8089/catalog.json',
        expect.objectContaining({
          timeout: DEFAULT_REQUEST_TIMEOUT_MS,
          size: MAX_CATALOG_BYTES,
        })
      );
    });

    it('rejects a cross-origin redirect', async () => {
      mockedFetch.mockImplementation(
        createFetchDouble({
          '/catalog.json': {
            body: '{}',
            url: 'https://evil.example/catalog.json',
          },
        }) as unknown as typeof fetch
      );

      await expect(
        fetchCatalogText({
          registryUrl: REGISTRY_URL,
          path: 'catalog.json',
          maxBytes: MAX_CATALOG_BYTES,
          timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
        })
      ).rejects.toThrow('redirects must remain on the registry origin');
    });

    it('rejects a non-2xx response', async () => {
      mockedFetch.mockImplementation(
        createFetchDouble({
          '/catalog.json': { status: 404, body: 'missing' },
        }) as unknown as typeof fetch
      );

      await expect(
        fetchCatalogText({
          registryUrl: REGISTRY_URL,
          path: 'catalog.json',
          maxBytes: MAX_CATALOG_BYTES,
          timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
        })
      ).rejects.toThrow('Catalog request failed with HTTP 404');
    });

    it('rejects an oversize response', async () => {
      mockedFetch.mockRejectedValue(
        Object.assign(new Error('content size over limit: 1048576'), {
          name: 'FetchError',
          type: 'max-size',
        })
      );

      await expect(
        fetchCatalogText({
          registryUrl: REGISTRY_URL,
          path: 'catalog.json',
          maxBytes: MAX_CATALOG_BYTES,
          timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
        })
      ).rejects.toThrow('exceeded the 1048576 byte limit');
    });

    it('rejects a timed-out request', async () => {
      mockedFetch.mockRejectedValue(
        Object.assign(new Error('network timeout at: http://127.0.0.1:8089/catalog.json'), {
          name: 'FetchError',
          type: 'request-timeout',
        })
      );

      await expect(
        fetchCatalogText({
          registryUrl: REGISTRY_URL,
          path: 'catalog.json',
          maxBytes: MAX_CATALOG_BYTES,
          timeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
        })
      ).rejects.toThrow('Catalog request timed out');
    });
  });
});
