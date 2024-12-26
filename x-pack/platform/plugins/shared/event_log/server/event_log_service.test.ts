/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogConfig } from './types';
import { EventLogService } from './event_log_service';
import { contextMock } from './es/context.mock';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { savedObjectProviderRegistryMock } from './saved_object_provider_registry.mock';

const loggingService = loggingSystemMock.create();
const systemLogger = loggingService.get();
const savedObjectProviderRegistry = savedObjectProviderRegistryMock.create();

describe('EventLogService', () => {
  const esContext = contextMock.create();

  function getService(config: IEventLogConfig) {
    const { logEntries, indexEntries } = config;
    return new EventLogService({
      esContext,
      systemLogger,
      kibanaUUID: '42',
      savedObjectProviderRegistry,
      config: {
        logEntries,
        indexEntries,
      },
      kibanaVersion: '1.0.1',
    });
  }

  test('returns config values from service methods', () => {
    let service;

    service = getService({ logEntries: true, indexEntries: true });
    expect(service.isLoggingEntries()).toEqual(true);
    expect(service.isIndexingEntries()).toEqual(true);

    service = getService({ logEntries: false, indexEntries: true });
    expect(service.isLoggingEntries()).toEqual(false);
    expect(service.isIndexingEntries()).toEqual(true);

    service = getService({ logEntries: true, indexEntries: false });
    expect(service.isLoggingEntries()).toEqual(true);
    expect(service.isIndexingEntries()).toEqual(false);

    service = getService({ logEntries: false, indexEntries: false });
    expect(service.isLoggingEntries()).toEqual(false);
    expect(service.isIndexingEntries()).toEqual(false);
  });

  test('handles registering provider actions correctly', () => {
    const params = {
      esContext,
      systemLogger,
      kibanaUUID: '42',
      savedObjectProviderRegistry,
      config: {
        enabled: true,
        logEntries: true,
        indexEntries: true,
      },
      kibanaVersion: '1.0.1',
    };

    const service = new EventLogService(params);
    let providerActions: ReturnType<EventLogService['getProviderActions']>;
    providerActions = service.getProviderActions();
    expect(providerActions.size).toEqual(0);

    service.registerProviderActions('foo', ['foo-1', 'foo-2']);
    providerActions = service.getProviderActions();
    expect(providerActions.size).toEqual(1);
    expect(providerActions.get('foo')).toEqual(new Set(['foo-1', 'foo-2']));

    expect(() => {
      service.registerProviderActions('invalid', []);
    }).toThrow('actions parameter must not be empty for provider: "invalid"');

    expect(() => {
      service.registerProviderActions('foo', ['abc']);
    }).toThrow('provider already registered: "foo"');
    expect(providerActions.get('foo')!.size).toEqual(2);

    expect(service.isProviderActionRegistered('foo', 'foo-1')).toEqual(true);
    expect(service.isProviderActionRegistered('foo', 'foo-2')).toEqual(true);
    expect(service.isProviderActionRegistered('foo', 'foo-3')).toEqual(false);
    expect(service.isProviderActionRegistered('invalid', 'foo')).toEqual(false);
  });

  test('returns a non-null logger from getLogger()', () => {
    const params = {
      esContext,
      systemLogger,
      kibanaUUID: '42',
      savedObjectProviderRegistry,
      config: {
        enabled: true,
        logEntries: true,
        indexEntries: true,
      },
      kibanaVersion: '1.0.1',
    };
    const service = new EventLogService(params);
    const eventLogger = service.getLogger({});
    expect(eventLogger).toBeTruthy();
  });

  describe('registerSavedObjectProvider', () => {
    test('register SavedObject Providers in the registry', () => {
      const params = {
        esContext,
        systemLogger,
        kibanaUUID: '42',
        savedObjectProviderRegistry,
        config: {
          enabled: true,
          logEntries: true,
          indexEntries: true,
        },
        kibanaVersion: '1.0.1',
      };
      const service = new EventLogService(params);
      const provider = jest.fn();
      service.registerSavedObjectProvider('myType', provider);
      expect(savedObjectProviderRegistry.registerProvider).toHaveBeenCalledWith('myType', provider);
    });
  });
});
