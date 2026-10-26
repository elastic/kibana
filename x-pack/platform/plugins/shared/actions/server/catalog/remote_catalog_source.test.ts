/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import {
  mapWithConcurrency,
  RemoteCatalogSource,
  resolveRegistryUrl,
} from './remote_catalog_source';

jest.mock('node-fetch');

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;
const REGISTRY_URL = 'https://workflows.elastic.co/connectors/v1';

const response = (body: string, init?: { status?: number; url?: string }) => ({
  ok: (init?.status ?? 200) < 400,
  status: init?.status ?? 200,
  url: init?.url ?? `${REGISTRY_URL}/catalog.json`,
  text: async () => body,
});

describe('RemoteCatalogSource', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('resolves a relative path on the registry origin', () => {
    expect(resolveRegistryUrl(REGISTRY_URL, 'catalog.json')).toBe(`${REGISTRY_URL}/catalog.json`);
    expect(resolveRegistryUrl(REGISTRY_URL, '/catalog.json')).toBe(`${REGISTRY_URL}/catalog.json`);
  });

  it('rejects a cross-origin path before fetch', async () => {
    const source = new RemoteCatalogSource({ registryUrl: REGISTRY_URL, kibanaVersion: '9.3.0' });
    await expect(source.readText('https://evil.example/catalog.json', 100)).rejects.toThrow(
      /registry origin/
    );
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('reads the manifest and signature in parallel and trims the signature', async () => {
    mockedFetch.mockImplementation(async (url: unknown) => {
      const href = String(url);
      if (href.endsWith('.sig')) {
        return response('  sig-value \n', { url: href }) as never;
      }
      return response('{"schemaVersion":1}', { url: href }) as never;
    });
    const source = new RemoteCatalogSource({ registryUrl: REGISTRY_URL, kibanaVersion: '9.3.0' });
    await expect(source.readManifest()).resolves.toEqual({
      bytes: '{"schemaVersion":1}',
      signature: 'sig-value',
    });
    expect(mockedFetch).toHaveBeenCalledWith(
      `${REGISTRY_URL}/catalog.json`,
      expect.objectContaining({ headers: { 'User-Agent': 'Kibana/9.3.0' } })
    );
  });

  it('rejects a redirect to another origin', async () => {
    mockedFetch.mockResolvedValue(
      response('{}', { url: 'https://evil.example/catalog.json' }) as never
    );
    const source = new RemoteCatalogSource({ registryUrl: REGISTRY_URL, kibanaVersion: '9.3.0' });
    await expect(source.readText('catalog.json', 100)).rejects.toThrow(/redirects must remain/);
  });

  it('maps max-size and request-timeout fetch errors', async () => {
    const source = new RemoteCatalogSource({ registryUrl: REGISTRY_URL, kibanaVersion: '9.3.0' });
    const maxSize = new Error('too big');
    maxSize.name = 'FetchError';
    (maxSize as Error & { type: string }).type = 'max-size';
    mockedFetch.mockRejectedValueOnce(maxSize);
    await expect(source.readText('catalog.json', 10)).rejects.toThrow(/byte limit/);

    const timeout = new Error('slow');
    timeout.name = 'FetchError';
    (timeout as Error & { type: string }).type = 'request-timeout';
    mockedFetch.mockRejectedValueOnce(timeout);
    await expect(source.readText('catalog.json', 10)).rejects.toThrow(/timed out/);
  });

  it('throws on HTTP 404', async () => {
    mockedFetch.mockResolvedValue(response('missing', { status: 404 }) as never);
    const source = new RemoteCatalogSource({ registryUrl: REGISTRY_URL, kibanaVersion: '9.3.0' });
    await expect(source.readText('catalog.json', 100)).rejects.toThrow(/HTTP 404/);
  });

  it('forwards the abort signal', async () => {
    const controller = new AbortController();
    mockedFetch.mockResolvedValue(response('{}') as never);
    const source = new RemoteCatalogSource({ registryUrl: REGISTRY_URL, kibanaVersion: '9.3.0' });
    await source.readText('catalog.json', 100, controller.signal);
    expect(mockedFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal })
    );
  });
});

describe('mapWithConcurrency', () => {
  it('preserves order and bounds in-flight work', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (item) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return item * 2;
    });
    expect(result).toEqual([2, 4, 6, 8]);
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});
