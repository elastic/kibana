/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObjectsClientContract, SavedObject } from '@kbn/core/server';
import type { MaintenanceWindowAttributes } from '@kbn/maintenance-windows-plugin/common';
import {
  MaintenanceWindowService,
  DEFAULT_MAINTENANCE_WINDOW_CACHE_INTERVAL_MS,
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

  it('returns only enabled MWs whose schedule covers the given time', async () => {
    const inWindow = buildSo('mw-active', 'default', {
      events: [{ gte: '2026-04-29T10:00:00.000Z', lte: '2026-04-29T12:00:00.000Z' }],
    });
    const outOfWindow = buildSo('mw-future', 'default', {
      events: [{ gte: '2099-01-01T00:00:00.000Z', lte: '2099-01-01T01:00:00.000Z' }],
    });

    client.createPointInTimeFinder.mockReturnValue(
      mockFinderForSavedObjects([inWindow, outOfWindow]) as ReturnType<
        SavedObjectsClientContract['createPointInTimeFinder']
      >
    );

    const service = new MaintenanceWindowService(client, buildLogger());
    const now = new Date('2026-04-29T11:00:00.000Z');

    const result = await service.getActiveMaintenanceWindows(now);

    expect(result.map((mw) => mw.id)).toEqual(['mw-active']);
    expect(result[0].spaceId).toBe('default');
  });

  it('passes namespaces:["*"] for cross-space find', async () => {
    client.createPointInTimeFinder.mockReturnValue(
      mockFinderForSavedObjects([]) as ReturnType<
        SavedObjectsClientContract['createPointInTimeFinder']
      >
    );

    const service = new MaintenanceWindowService(client, buildLogger());
    await service.getActiveMaintenanceWindows(new Date());

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
    const now = new Date('2026-04-29T12:00:00.000Z');

    await service.getActiveMaintenanceWindows(now);
    await service.getActiveMaintenanceWindows(now);
    await service.getActiveMaintenanceWindows(now);

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

    const service = new MaintenanceWindowService(client, buildLogger(), 10);
    const now = new Date('2026-04-29T12:00:00.000Z');

    await service.getActiveMaintenanceWindows(now);
    await new Promise((resolve) => setTimeout(resolve, 25));
    await service.getActiveMaintenanceWindows(now);

    expect(client.createPointInTimeFinder).toHaveBeenCalledTimes(2);
  });

  it('returns empty array on fetch error and logs', async () => {
    const finderThatThrows = {
      async *find() {
        throw new Error('boom');
      },
      close: jest.fn().mockResolvedValue(undefined),
    };
    client.createPointInTimeFinder.mockReturnValue(
      finderThatThrows as ReturnType<SavedObjectsClientContract['createPointInTimeFinder']>
    );

    const logger = buildLogger();
    const service = new MaintenanceWindowService(client, logger);

    const result = await service.getActiveMaintenanceWindows(new Date());

    expect(result).toEqual([]);
    expect(logger.error).toHaveBeenCalled();
  });

  it('skips docs without a namespace', async () => {
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
    const result = await service.getActiveMaintenanceWindows(new Date('2026-04-29T12:00:00.000Z'));

    expect(result).toEqual([]);
  });

  it('uses default cache interval', () => {
    expect(DEFAULT_MAINTENANCE_WINDOW_CACHE_INTERVAL_MS).toBe(60_000);
  });
});
