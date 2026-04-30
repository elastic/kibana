/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
  type MaintenanceWindowAttributes,
} from '@kbn/maintenance-windows-plugin/common';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { MaintenanceWindowService } from '../../services/maintenance_window_service/maintenance_window_service';
import { setupTestServers } from './setup_test_servers';

const buildAttrs = (
  overrides: Partial<MaintenanceWindowAttributes> = {}
): MaintenanceWindowAttributes => ({
  title: 'Test MW',
  enabled: true,
  duration: 60 * 60 * 1000,
  expirationDate: '2099-01-01T00:00:00.000Z',
  events: [{ gte: '2026-01-22T07:00:00.000Z', lte: '2026-01-22T08:00:00.000Z' }],
  rRule: { dtstart: '2026-01-22T07:00:00.000Z', tzid: 'UTC' },
  createdBy: null,
  updatedBy: null,
  createdAt: '2026-01-22T06:00:00.000Z',
  updatedAt: '2026-01-22T06:00:00.000Z',
  schedule: {
    custom: {
      start: '2026-01-22T07:00:00.000Z',
      duration: '1h',
    },
  },
  ...overrides,
});

describe('MaintenanceWindowService integration', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let service: MaintenanceWindowService;
  let createdIds: Array<{ id: string; namespace?: string }> = [];

  beforeAll(async () => {
    const servers = await setupTestServers();
    esServer = servers.esServer;
    kibanaServer = servers.kibanaServer;

    const client = kibanaServer.coreStart.savedObjects.getUnsafeInternalClient({
      includedHiddenTypes: [MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE],
    });

    service = new MaintenanceWindowService(client, createLoggerService().loggerService, 0);
  });

  afterAll(async () => {
    if (kibanaServer) await kibanaServer.stop();
    if (esServer) await esServer.stop();
  });

  afterEach(async () => {
    const client = kibanaServer.coreStart.savedObjects.getUnsafeInternalClient({
      includedHiddenTypes: [MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE],
    });
    for (const { id, namespace } of createdIds) {
      try {
        await client.delete(MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE, id, {
          ...(namespace ? { namespace } : {}),
        });
      } catch {
        // ignore
      }
    }
    createdIds = [];
  });

  const createMw = async (
    attrs: Partial<MaintenanceWindowAttributes> = {},
    namespace?: string
  ): Promise<string> => {
    const client = kibanaServer.coreStart.savedObjects.getUnsafeInternalClient({
      includedHiddenTypes: [MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE],
    });
    const created = await client.create<MaintenanceWindowAttributes>(
      MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      buildAttrs(attrs),
      namespace ? { namespace } : undefined
    );
    createdIds.push({ id: created.id, namespace });
    return created.id;
  };

  it('returns enabled MW whose schedule covers the given time, with spaceId derived from namespace', async () => {
    const id = await createMw({
      title: 'in-window',
      events: [{ gte: '2026-01-22T07:00:00.000Z', lte: '2026-01-22T08:00:00.000Z' }],
    });

    const result = await service.getActiveMaintenanceWindows(new Date('2026-01-22T07:30:00.000Z'));

    const found = result.find((mw) => mw.id === id);
    expect(found).toBeDefined();
    expect(found?.spaceId).toBe('default');
  });

  it('omits MW whose schedule is outside the given time', async () => {
    const id = await createMw({
      title: 'past',
      events: [{ gte: '2025-01-01T00:00:00.000Z', lte: '2025-01-01T01:00:00.000Z' }],
    });

    const result = await service.getActiveMaintenanceWindows(new Date('2026-01-22T07:30:00.000Z'));

    expect(result.find((mw) => mw.id === id)).toBeUndefined();
  });

  it('omits disabled MW', async () => {
    const id = await createMw({
      title: 'disabled',
      enabled: false,
      events: [{ gte: '2026-01-22T07:00:00.000Z', lte: '2026-01-22T08:00:00.000Z' }],
    });

    const result = await service.getActiveMaintenanceWindows(new Date('2026-01-22T07:30:00.000Z'));

    expect(result.find((mw) => mw.id === id)).toBeUndefined();
  });

  it('returns scope.episodes from the SO when present', async () => {
    const id = await createMw({
      title: 'with-scope-episodes',
      events: [{ gte: '2026-01-22T07:00:00.000Z', lte: '2026-01-22T08:00:00.000Z' }],
      scope: {
        episodes: {
          kql: 'data.severity: "critical"',
          filters: [],
          dsl: '',
        },
      },
    });

    const result = await service.getActiveMaintenanceWindows(new Date('2026-01-22T07:30:00.000Z'));

    const found = result.find((mw) => mw.id === id);
    expect(found?.scope?.episodes?.kql).toBe('data.severity: "critical"');
  });
});
