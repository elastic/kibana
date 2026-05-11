/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { MaintenanceWindowAttributes } from '@kbn/maintenance-windows-plugin/common';
import {
  DEFAULT_MAINTENANCE_WINDOW_CACHE_INTERVAL_MS,
  MaintenanceWindowService,
} from './maintenance_window_service';

const buildSo = (
  id: string,
  spaceId: string,
  attributes: Partial<MaintenanceWindowAttributes>
): SavedObject<MaintenanceWindowAttributes> => ({
  id,
  type: 'maintenance-window',
  references: [],
  namespaces: [spaceId],
  attributes: {
    title: `mw-${id}`,
    enabled: true,
    duration: 3600,
    expirationDate: new Date('2099-01-01').toISOString(),
    events: [],
    rRule: { dtstart: new Date().toISOString(), tzid: 'UTC' },
    createdBy: null,
    updatedBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schedule: {
      custom: {
        start: new Date().toISOString(),
        duration: '1h',
      },
    },
    ...attributes,
  } as MaintenanceWindowAttributes,
});

const mockFinderForSavedObjects = (docs: Array<SavedObject<MaintenanceWindowAttributes>>) => ({
  async *find() {
    yield { saved_objects: docs };
  },
  close: jest.fn().mockResolvedValue(undefined),
});

const buildLogger = () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

describe('MaintenanceWindowService', () => {
  let client: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    client = savedObjectsClientMock.create();
  });

  it('returns all enabled MWs across spaces with events pre-parsed to ms', async () => {
    const past = buildSo('mw-past', 'default', {
      events: [{ gte: '2025-01-01T00:00:00.000Z', lte: '2025-01-01T01:00:00.000Z' }],
    });
    const future = buildSo('mw-future', 'team-a', {
      events: [{ gte: '2099-01-01T00:00:00.000Z', lte: '2099-01-01T01:00:00.000Z' }],
    });

    client.createPointInTimeFinder.mockReturnValue(
      mockFinderForSavedObjects([past, future]) as ReturnType<
        SavedObjectsClientContract['createPointInTimeFinder']
      >
    );

    const service = new MaintenanceWindowService(client, buildLogger());

    const result = await service.getEnabledMaintenanceWindows();

    expect(result.map((mw) => mw.id).sort()).toEqual(['mw-future', 'mw-past']);
    expect(result.find((mw) => mw.id === 'mw-past')!.events).toEqual([
      {
        gteMs: Date.parse('2025-01-01T00:00:00.000Z'),
        lteMs: Date.parse('2025-01-01T01:00:00.000Z'),
      },
    ]);
    expect(result.find((mw) => mw.id === 'mw-future')!.spaceId).toBe('team-a');
  });

  it('passes namespaces:["*"] for cross-space find', async () => {
    client.createPointInTimeFinder.mockReturnValue(
      mockFinderForSavedObjects([]) as ReturnType<
        SavedObjectsClientContract['createPointInTimeFinder']
      >
    );

    const service = new MaintenanceWindowService(client, buildLogger());
    await service.getEnabledMaintenanceWindows();

    expect(client.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'maintenance-window',
        namespaces: ['*'],
        filter: 'maintenance-window.attributes.enabled: true',
      })
    );
  });

  it('caches results within the cache interval', async () => {
    const mw = buildSo('mw-1', 'default', {
      events: [{ gte: '2026-04-29T00:00:00.000Z', lte: '2026-04-29T23:00:00.000Z' }],
    });

    client.createPointInTimeFinder.mockReturnValue(
      mockFinderForSavedObjects([mw]) as ReturnType<
        SavedObjectsClientContract['createPointInTimeFinder']
      >
    );

    const service = new MaintenanceWindowService(client, buildLogger());
    await service.getEnabledMaintenanceWindows();
    await service.getEnabledMaintenanceWindows();
    await service.getEnabledMaintenanceWindows();

    expect(client.createPointInTimeFinder).toHaveBeenCalledTimes(1);
  });

  it('refetches after cache TTL expires', async () => {
    const mw = buildSo('mw-1', 'default', {
      events: [{ gte: '2026-04-29T00:00:00.000Z', lte: '2026-04-29T23:00:00.000Z' }],
    });

    client.createPointInTimeFinder.mockReturnValue(
      mockFinderForSavedObjects([mw]) as ReturnType<
        SavedObjectsClientContract['createPointInTimeFinder']
      >
    );

    const service = new MaintenanceWindowService(client, buildLogger(), { cacheIntervalMs: 10 });
    await service.getEnabledMaintenanceWindows();
    await new Promise((resolve) => setTimeout(resolve, 25));
    await service.getEnabledMaintenanceWindows();

    expect(client.createPointInTimeFinder).toHaveBeenCalledTimes(2);
  });

  it('returns empty array on fetch error, logs, and still closes the PIT finder', async () => {
    const close = jest.fn().mockResolvedValue(undefined);
    const finderThatThrows = {
      async *find() {
        throw new Error('boom');
      },
      close,
    };
    client.createPointInTimeFinder.mockReturnValue(
      finderThatThrows as ReturnType<SavedObjectsClientContract['createPointInTimeFinder']>
    );

    const logger = buildLogger();
    const service = new MaintenanceWindowService(client, logger);

    const result = await service.getEnabledMaintenanceWindows();

    expect(result).toEqual([]);
    expect(logger.error).toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('returns fetched windows even when finder.close() throws', async () => {
    const valid = buildSo('mw-ok', 'default', {
      events: [{ gte: '2026-04-29T00:00:00.000Z', lte: '2026-04-29T23:00:00.000Z' }],
    });
    const finderWithFailingClose = {
      async *find() {
        yield { saved_objects: [valid] };
      },
      close: jest.fn().mockRejectedValue(new Error('close boom')),
    };
    client.createPointInTimeFinder.mockReturnValue(
      finderWithFailingClose as ReturnType<SavedObjectsClientContract['createPointInTimeFinder']>
    );

    const logger = buildLogger();
    const service = new MaintenanceWindowService(client, logger);

    const result = await service.getEnabledMaintenanceWindows();

    expect(result.map((mw) => mw.id)).toEqual(['mw-ok']);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('skips a malformed MW with missing events and still returns the valid ones', async () => {
    const malformed = buildSo('mw-bad', 'default', {});
    delete (malformed.attributes as unknown as { events?: unknown }).events;
    const valid = buildSo('mw-ok', 'default', {
      events: [{ gte: '2026-04-29T00:00:00.000Z', lte: '2026-04-29T23:00:00.000Z' }],
    });

    client.createPointInTimeFinder.mockReturnValue(
      mockFinderForSavedObjects([malformed, valid]) as ReturnType<
        SavedObjectsClientContract['createPointInTimeFinder']
      >
    );

    const logger = buildLogger();
    const service = new MaintenanceWindowService(client, logger);

    const result = await service.getEnabledMaintenanceWindows();

    expect(result.map((mw) => mw.id)).toEqual(['mw-ok']);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('falls back to the default space when a doc has no namespaces array', async () => {
    const noNamespace = buildSo('mw-1', 'default', {
      events: [{ gte: '2026-04-29T00:00:00.000Z', lte: '2026-04-29T23:00:00.000Z' }],
    });
    noNamespace.namespaces = [];

    client.createPointInTimeFinder.mockReturnValue(
      mockFinderForSavedObjects([noNamespace]) as ReturnType<
        SavedObjectsClientContract['createPointInTimeFinder']
      >
    );

    const service = new MaintenanceWindowService(client, buildLogger());
    const result = await service.getEnabledMaintenanceWindows();

    expect(result).toHaveLength(1);
    expect(result[0].spaceId).toBe('default');
  });

  it('uses default cache interval', () => {
    expect(DEFAULT_MAINTENANCE_WINDOW_CACHE_INTERVAL_MS).toBe(60_000);
  });
});
