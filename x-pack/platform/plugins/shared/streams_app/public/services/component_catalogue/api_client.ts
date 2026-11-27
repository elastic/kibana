/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpResponse } from '@kbn/core/public';
import { STALE_COMPONENT_CATALOGUE_HEADER, type ComponentCatalogue } from '@kbn/streams-schema';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { ComponentCatalogueClient, FetchedComponentCatalogue } from './types';

/**
 * The browser side of the component catalogue, created once per app mount on the start contract.
 * Every consumer refetches on mount; Kibana lets the browser reuse the response for a minute and
 * revalidate it with an ETag after that, so the refetch is a cache hit or a 304. The last
 * catalogue is kept so that even a real fetch is a background revalidation, not a loading state.
 */
export const createComponentCatalogueClient = ({
  streamsRepositoryClient,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
}): ComponentCatalogueClient => {
  let last: FetchedComponentCatalogue | undefined;
  let inFlight: Promise<FetchedComponentCatalogue> | undefined;

  const fetchCatalogue = async (forceRefresh: boolean): Promise<FetchedComponentCatalogue> => {
    // `asResponse` is needed for the stale header, so the typed body is read off the response.
    const { body, response } = (await streamsRepositoryClient.fetch(
      'GET /internal/streams/components',
      {
        // Callers share the request, so no single caller's signal may abort it.
        signal: null,
        asResponse: true,
        // `no-cache` still sends If-None-Match, so an unchanged catalogue is a 304, not a body.
        ...(forceRefresh ? { cache: 'no-cache' } : {}),
      }
    )) as unknown as HttpResponse<ComponentCatalogue>;
    if (!body) {
      throw new Error('The component catalogue response had no body.');
    }
    return {
      catalogue: body,
      stale: response?.headers.get(STALE_COMPONENT_CATALOGUE_HEADER) === 'true',
    };
  };

  return {
    getLastCatalogue: () => last,
    getCatalogue: ({ forceRefresh = false } = {}) => {
      inFlight ??= fetchCatalogue(forceRefresh)
        .then((fetched) => {
          last = fetched;
          return fetched;
        })
        .finally(() => {
          inFlight = undefined;
        });
      return inFlight;
    },
  };
};
