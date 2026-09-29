/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { KibanaRequest } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { EventLogClient } from './event_log_client';
import { EventLogClientService } from './event_log_start_service';
import { contextMock } from './es/context.mock';
import { savedObjectProviderRegistryMock } from './saved_object_provider_registry.mock';

vi.mock('./event_log_client');

describe('EventLogClientService', () => {
  const esContext = contextMock.create();

  describe('getClient', () => {
    test('creates a client with a scoped SavedObjects client', async () => {
      const savedObjectProviderRegistry = savedObjectProviderRegistryMock.create();
      const request = fakeRequest();

      const eventLogStartService = new EventLogClientService({
        esContext,
        savedObjectProviderRegistry,
      });

      eventLogStartService.getClient(request);

      const savedObjectGetter = savedObjectProviderRegistry.getProvidersClient(request);
      expect(EventLogClient).toHaveBeenCalledWith({
        esContext,
        request,
        savedObjectGetter,
        spacesService: undefined,
      });

      expect(savedObjectProviderRegistry.getProvidersClient).toHaveBeenCalledWith(request);
    });
  });
});

function fakeRequest(): KibanaRequest {
  const savedObjectsClient = savedObjectsClientMock.create();
  return {
    headers: {},
    getBasePath: () => '',
    path: '/',
    route: { settings: {} },
    url: {
      href: '/',
    },
    raw: {
      req: {
        url: '/',
      },
    },
    getSavedObjectsClient: () => savedObjectsClient,
  } as unknown as KibanaRequest;
}
