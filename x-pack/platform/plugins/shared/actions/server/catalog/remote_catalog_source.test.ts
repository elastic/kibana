/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  MAX_CATALOG_BYTES,
  RemoteCatalogSource,
  resolveRegistryUrl,
} from './remote_catalog_source';
import { createLiveCatalogFetchDouble, LIVE_CATALOG_MANIFEST } from './test_fixtures';

jest.mock('node-fetch');

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;
const REGISTRY_URL = 'http://127.0.0.1:8089';

describe('RemoteCatalogSource', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('pins a relative path to the registry origin', () => {
    expect(resolveRegistryUrl(REGISTRY_URL, 'catalog.json')).toBe(
      'http://127.0.0.1:8089/catalog.json'
    );
  });

  it('rejects a cross-origin absolute URL', () => {
    expect(() => resolveRegistryUrl(REGISTRY_URL, 'https://evil.example/catalog.json')).toThrow(
      'must remain on the registry origin'
    );
  });

  it('reads catalog.json and catalog.json.sig with the Kibana user agent', async () => {
    mockedFetch.mockImplementation(createLiveCatalogFetchDouble() as unknown as typeof fetch);
    const source = new RemoteCatalogSource({
      registryUrl: REGISTRY_URL,
      kibanaVersion: '9.3.0',
    });
    const manifest = await source.readManifest();
    expect(manifest.bytes).toBe(LIVE_CATALOG_MANIFEST);
    expect(manifest.signature.length).toBeGreaterThan(0);
    expect(mockedFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8089/catalog.json',
      expect.objectContaining({
        timeout: DEFAULT_REQUEST_TIMEOUT_MS,
        size: MAX_CATALOG_BYTES,
        headers: { 'User-Agent': 'Kibana/9.3.0' },
      })
    );
  });

  it('rejects a cross-origin redirect', async () => {
    mockedFetch.mockImplementation(
      createLiveCatalogFetchDouble({
        '/catalog.json': { body: LIVE_CATALOG_MANIFEST, url: 'https://evil.example/catalog.json' },
      }) as unknown as typeof fetch
    );
    const source = new RemoteCatalogSource({
      registryUrl: REGISTRY_URL,
      kibanaVersion: '9.3.0',
    });
    await expect(source.readText('catalog.json', MAX_CATALOG_BYTES)).rejects.toThrow(
      'redirects must remain on the registry origin'
    );
  });
});
