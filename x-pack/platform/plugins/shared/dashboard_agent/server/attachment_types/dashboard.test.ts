/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectReference,
  SavedObjectsClientContract,
} from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/core/server';
import {
  hashContent,
  type VersionedAttachmentWithOrigin,
} from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachmentData,
} from '@kbn/dashboard-agent-common';
import type { DashboardSavedObjectAttributes } from '@kbn/dashboard-plugin/server';
import { createDashboardAttachmentType } from './dashboard';

const references: SavedObjectReference[] = [
  {
    id: 'lens-1',
    name: 'panel-panel-1',
    type: 'lens',
  },
];

const dashboardAttributes: DashboardSavedObjectAttributes = {
  title: 'System Overview',
  description: 'Main dashboard for key metrics',
  kibanaSavedObjectMeta: {
    searchSourceJSON: '{}',
  },
  panelsJSON: JSON.stringify([
    {
      type: 'lens',
      panelIndex: 'panel-1',
      gridData: { x: 0, y: 0, w: 24, h: 15, i: 'panel-1' },
      panelRefName: 'panel-panel-1',
      embeddableConfig: {
        attributes: {
          title: 'CPU Usage',
          visualizationType: 'lnsXY',
          state: {
            datasourceStates: {},
            filters: [],
            query: { language: 'kuery', query: '' },
            visualization: {},
          },
          references: [],
        },
      },
    },
  ]),
  optionsJSON: '{}',
};

const createSavedObjectsClient = ({
  updatedAt = '2025-01-02T00:00:00.000Z',
}: {
  updatedAt?: string;
} = {}): jest.Mocked<Pick<SavedObjectsClientContract, 'resolve'>> =>
  ({
    resolve: jest.fn().mockResolvedValue({
      outcome: 'exactMatch',
      saved_object: {
        id: 'dashboard-1',
        updated_at: updatedAt,
        attributes: dashboardAttributes,
        references,
      },
    }),
  } as jest.Mocked<Pick<SavedObjectsClientContract, 'resolve'>>);

const createLogger = (): Logger =>
  ({
    debug: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const createAttachment = (
  data: DashboardAttachmentData
): VersionedAttachmentWithOrigin<typeof DASHBOARD_ATTACHMENT_TYPE, DashboardAttachmentData> => ({
  id: 'att-1',
  type: DASHBOARD_ATTACHMENT_TYPE,
  origin: 'dashboard-1',
  origin_snapshot_at: '2025-01-01T00:00:00.000Z',
  versions: [
    {
      version: 1,
      data,
      created_at: '2025-01-01T00:00:00.000Z',
      content_hash: hashContent(data),
    },
  ],
  current_version: 1,
  active: true,
  readonly: false,
});

describe('createDashboardAttachmentType', () => {
  it('resolves dashboard attachments with savedObjectsClient', async () => {
    const savedObjectsClient = createSavedObjectsClient();
    const definition = createDashboardAttachmentType({ logger: createLogger() });

    const result = await definition.resolve?.('dashboard-1', {
      request: {} as never,
      spaceId: 'default',
      savedObjectsClient: savedObjectsClient as unknown as SavedObjectsClientContract,
    });

    expect(savedObjectsClient.resolve).toHaveBeenCalledWith('dashboard', 'dashboard-1');
    expect(result).toEqual(
      expect.objectContaining({
        title: 'System Overview',
        description: 'Main dashboard for key metrics',
      })
    );
    expect(result?.panels).toHaveLength(1);
  });

  it('returns true when the saved dashboard changed after the snapshot', async () => {
    const savedObjectsClient = createSavedObjectsClient();
    const definition = createDashboardAttachmentType({ logger: createLogger() });

    const isStale = await definition.isStale?.(
      createAttachment({
        title: 'Old title',
        description: 'Main dashboard for key metrics',
        panels: [],
      }),
      {
        request: {} as never,
        spaceId: 'default',
        savedObjectsClient: savedObjectsClient as unknown as SavedObjectsClientContract,
      }
    );

    expect(isStale).toBe(true);
  });

  it('returns false when the saved dashboard content matches the attachment', async () => {
    const savedObjectsClient = createSavedObjectsClient();
    const definition = createDashboardAttachmentType({ logger: createLogger() });
    const resolvedData = await definition.resolve?.('dashboard-1', {
      request: {} as never,
      spaceId: 'default',
      savedObjectsClient: savedObjectsClient as unknown as SavedObjectsClientContract,
    });

    const isStale = await definition.isStale?.(createAttachment(resolvedData!), {
      request: {} as never,
      spaceId: 'default',
      savedObjectsClient: savedObjectsClient as unknown as SavedObjectsClientContract,
    });

    expect(isStale).toBe(false);
  });
});
