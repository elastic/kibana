/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  hashContent,
  type VersionedAttachmentWithOrigin,
} from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  attachmentDataToDashboardState,
  type DashboardAttachmentData,
} from '@kbn/dashboard-agent-common';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createDashboardAttachmentType } from './dashboard';

const dashboardAttachmentData: DashboardAttachmentData = {
  title: 'System Overview',
  description: 'Main dashboard for key metrics',
  panels: [
    {
      type: LENS_EMBEDDABLE_TYPE,
      id: 'panel-1',
      grid: { x: 0, y: 0, w: 24, h: 15 },
      config: {
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
  ],
};

const createDashboardClient = ({
  updatedAt = '2025-01-02T00:00:00.000Z',
}: {
  updatedAt?: string;
} = {}): jest.Mocked<DashboardPluginStart['client']> =>
  ({
    read: jest.fn().mockResolvedValue({
      id: 'dashboard-1',
      data: attachmentDataToDashboardState(dashboardAttachmentData),
      meta: {
        outcome: 'exactMatch',
        updated_at: updatedAt,
        version: 'v1',
      },
    }),
  } as jest.Mocked<DashboardPluginStart['client']>);

const createLogger = (): Logger =>
  ({
    debug: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const createSavedObjectsClient = (): SavedObjectsClientContract =>
  ({} as SavedObjectsClientContract);

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
  it('resolves dashboard attachments with dashboard client.read', async () => {
    const dashboardClient = createDashboardClient();
    const savedObjectsClient = createSavedObjectsClient();
    const definition = createDashboardAttachmentType({
      logger: createLogger(),
      getDashboardClient: async () => dashboardClient,
    });

    const result = await definition.resolve?.('dashboard-1', {
      request: {} as never,
      spaceId: 'default',
      savedObjectsClient,
    });

    expect(dashboardClient.read).toHaveBeenCalledWith(
      expect.objectContaining({ resolve: expect.any(Function) }),
      'dashboard-1'
    );
    await expect(dashboardClient.read.mock.calls[0][0].resolve(['core'])).resolves.toEqual({
      core: {
        savedObjects: {
          client: savedObjectsClient,
        },
      },
    });
    expect(result).toEqual(
      expect.objectContaining({
        title: 'System Overview',
        description: 'Main dashboard for key metrics',
      })
    );
    expect(result?.panels).toHaveLength(1);
  });

  it('returns true when the saved dashboard changed after the snapshot', async () => {
    const dashboardClient = createDashboardClient();
    const savedObjectsClient = createSavedObjectsClient();
    const definition = createDashboardAttachmentType({
      logger: createLogger(),
      getDashboardClient: async () => dashboardClient,
    });

    const isStale = await definition.isStale?.(
      createAttachment({
        title: 'Old title',
        description: 'Main dashboard for key metrics',
        panels: [],
      }),
      {
        request: {} as never,
        spaceId: 'default',
        savedObjectsClient,
      }
    );

    expect(isStale).toBe(true);
    expect(dashboardClient.read).toHaveBeenCalledWith(
      expect.objectContaining({ resolve: expect.any(Function) }),
      'dashboard-1'
    );
    await expect(dashboardClient.read.mock.calls[0][0].resolve(['core'])).resolves.toEqual({
      core: {
        savedObjects: {
          client: savedObjectsClient,
        },
      },
    });
  });

  it('returns false when the saved dashboard content matches the attachment', async () => {
    const dashboardClient = createDashboardClient();
    const savedObjectsClient = createSavedObjectsClient();
    const definition = createDashboardAttachmentType({
      logger: createLogger(),
      getDashboardClient: async () => dashboardClient,
    });
    const resolvedData = await definition.resolve?.('dashboard-1', {
      request: {} as never,
      spaceId: 'default',
      savedObjectsClient,
    });

    const isStale = await definition.isStale?.(createAttachment(resolvedData!), {
      request: {} as never,
      spaceId: 'default',
      savedObjectsClient,
    });

    expect(isStale).toBe(false);
    expect(dashboardClient.read).toHaveBeenLastCalledWith(
      expect.objectContaining({ resolve: expect.any(Function) }),
      'dashboard-1'
    );
    await expect(dashboardClient.read.mock.calls[1][0].resolve(['core'])).resolves.toEqual({
      core: {
        savedObjects: {
          client: savedObjectsClient,
        },
      },
    });
  });

  it('treats legacy wrapped Lens configs as equal when checking staleness', async () => {
    const dashboardClient = {
      read: jest.fn().mockResolvedValue({
        id: 'dashboard-1',
        data: {
          title: 'System Overview',
          description: 'Main dashboard for key metrics',
          panels: [
            {
              type: LENS_EMBEDDABLE_TYPE,
              id: 'panel-1',
              grid: { x: 0, y: 0, w: 24, h: 15 },
              config: {
                type: 'lnsXY',
                title: 'CPU Usage',
              },
            },
          ],
        },
        meta: {
          outcome: 'exactMatch',
          updated_at: '2025-01-02T00:00:00.000Z',
          version: 'v1',
        },
      }),
    } as jest.Mocked<DashboardPluginStart['client']>;
    const savedObjectsClient = createSavedObjectsClient();
    const definition = createDashboardAttachmentType({
      logger: createLogger(),
      getDashboardClient: async () => dashboardClient,
    });

    const isStale = await definition.isStale?.(
      createAttachment({
        ...dashboardAttachmentData,
        panels: [
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'panel-1',
            grid: { x: 0, y: 0, w: 24, h: 15 },
            config: {
              title: 'CPU Usage',
              attributes: {
                type: 'lnsXY',
              },
            },
          },
        ],
      }),
      {
        request: {} as never,
        spaceId: 'default',
        savedObjectsClient,
      }
    );

    expect(isStale).toBe(false);
  });
});
