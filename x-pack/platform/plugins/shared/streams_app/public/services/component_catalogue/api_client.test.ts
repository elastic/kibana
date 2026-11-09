/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import fixture from './catalogue_snapshot/components_v1.json';
import { createComponentCatalogueClient } from './api_client';

const repositoryClient = (fetch: jest.Mock) => ({ fetch } as unknown as StreamsRepositoryClient);

/** What `http.fetch` resolves with when asked for the response. */
const httpResponse = (body: unknown, headers: Record<string, string> = {}) => ({
  body,
  response: { headers: new Headers(headers) },
});

describe('createComponentCatalogueClient', () => {
  it('shares one request between concurrent callers and reads the catalogue off the response', async () => {
    const fetch = jest.fn().mockResolvedValue(httpResponse(fixture));
    const client = createComponentCatalogueClient({
      streamsRepositoryClient: repositoryClient(fetch),
    });

    const [first, second] = await Promise.all([client.getCatalogue(), client.getCatalogue()]);

    expect(first).toEqual({ catalogue: fixture, stale: false });
    expect(second).toBe(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('GET /internal/streams/components', {
      signal: null,
      asResponse: true,
    });
  });

  it('asks Kibana again on a forced refresh instead of reusing the browser cache', async () => {
    const fetch = jest.fn().mockResolvedValue(httpResponse(fixture));
    const client = createComponentCatalogueClient({
      streamsRepositoryClient: repositoryClient(fetch),
    });

    await client.getCatalogue({ forceRefresh: true });

    expect(fetch).toHaveBeenCalledWith('GET /internal/streams/components', {
      signal: null,
      asResponse: true,
      cache: 'no-cache',
    });
  });

  it('reports a catalogue Kibana served from its cache as stale', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValue(httpResponse(fixture, { 'x-streams-catalogue-stale': 'true' }));
    const client = createComponentCatalogueClient({
      streamsRepositoryClient: repositoryClient(fetch),
    });

    await expect(client.getCatalogue()).resolves.toEqual({ catalogue: fixture, stale: true });
  });

  it('refetches on each call and remembers the last catalogue it got', async () => {
    const updated = { ...fixture, component_revision: 'next' };
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(httpResponse(fixture))
      .mockResolvedValueOnce(httpResponse(updated));
    const client = createComponentCatalogueClient({
      streamsRepositoryClient: repositoryClient(fetch),
    });

    expect(client.getLastCatalogue()).toBeUndefined();
    await client.getCatalogue();
    expect(client.getLastCatalogue()?.catalogue).toBe(fixture);
    await expect(client.getCatalogue()).resolves.toMatchObject({ catalogue: updated });
    expect(client.getLastCatalogue()?.catalogue).toBe(updated);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps the last catalogue when a refetch fails, and fetches again after that', async () => {
    const fetch = jest
      .fn()
      .mockResolvedValueOnce(httpResponse(fixture))
      .mockRejectedValueOnce(new Error('Bad Gateway'))
      .mockResolvedValueOnce(httpResponse(fixture));
    const client = createComponentCatalogueClient({
      streamsRepositoryClient: repositoryClient(fetch),
    });

    await client.getCatalogue();
    await expect(client.getCatalogue()).rejects.toThrow('Bad Gateway');
    expect(client.getLastCatalogue()?.catalogue).toBe(fixture);
    await expect(client.getCatalogue()).resolves.toMatchObject({ catalogue: fixture });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
