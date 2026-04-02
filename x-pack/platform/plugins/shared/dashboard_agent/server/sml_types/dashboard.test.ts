/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core-saved-objects-api-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { Logger } from '@kbn/logging';
import type { DashboardSavedObjectAttributes } from '@kbn/dashboard-plugin/server';
import type { DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import { dashboardSmlType } from './dashboard';

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
    {
      type: 'markdown',
      panelIndex: 'panel-2',
      gridData: { x: 24, y: 0, w: 24, h: 10, i: 'panel-2', sectionId: 'section-1' },
      embeddableConfig: {
        title: 'Summary',
        content: 'All systems nominal',
      },
    },
  ]),
  optionsJSON: '{}',
  sections: [
    {
      gridData: { y: 20, i: 'section-1' },
      title: 'Operations',
      collapsed: false,
    },
  ],
};

const dashboardWithLensApiAttributes: DashboardSavedObjectAttributes = {
  title: 'API Lens Dashboard',
  description: 'Dashboard with API-format lens panel',
  kibanaSavedObjectMeta: {
    searchSourceJSON: '{}',
  },
  panelsJSON: JSON.stringify([
    {
      type: 'lens',
      panelIndex: 'panel-3',
      gridData: { x: 0, y: 0, w: 24, h: 12, i: 'panel-3' },
      embeddableConfig: {
        attributes: {
          type: 'lnsXY',
          title: 'Request Rate',
        },
      },
    },
  ]),
  optionsJSON: '{}',
};

const createSavedObjectsClient = () => {
  const finder = {
    find: jest.fn().mockReturnValue(
      (async function* () {
        yield {
          saved_objects: [
            {
              id: 'dashboard-1',
              updated_at: '2025-01-01T00:00:00.000Z',
              namespaces: ['default'],
            },
          ],
        };
      })()
    ),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const savedObjectsClient = {
    createPointInTimeFinder: jest.fn().mockReturnValue(finder),
    get: jest.fn().mockResolvedValue({
      id: 'dashboard-1',
      attributes: dashboardAttributes,
      references,
    }),
    resolve: jest.fn().mockResolvedValue({
      saved_object: {
        id: 'dashboard-1',
        attributes: dashboardAttributes,
        references,
      },
    }),
  } as unknown as SavedObjectsClientContract;

  return { savedObjectsClient, finder };
};

const createLogger = (): Logger =>
  ({
    warn: jest.fn(),
  } as unknown as Logger);

describe('dashboardSmlType', () => {
  it('lists dashboards across all spaces', async () => {
    const { savedObjectsClient, finder } = createSavedObjectsClient();

    const pages = [];
    for await (const page of dashboardSmlType.list({
      savedObjectsClient,
      esClient: {} as never,
      logger: createLogger(),
    })) {
      pages.push(page);
    }

    expect(savedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith({
      type: 'dashboard',
      perPage: 1000,
      namespaces: ['*'],
      fields: ['title'],
    });
    expect(pages).toEqual([
      [
        {
          id: 'dashboard-1',
          updatedAt: '2025-01-01T00:00:00.000Z',
          spaces: ['default'],
        },
      ],
    ]);
    expect(finder.close).toHaveBeenCalledTimes(1);
  });

  it('indexes one chunk per dashboard with deep metadata', async () => {
    const { savedObjectsClient } = createSavedObjectsClient();

    const result = await dashboardSmlType.getSmlData('dashboard-1', {
      savedObjectsClient,
      esClient: {} as never,
      logger: createLogger(),
    });

    expect(result).toEqual({
      chunks: [
        expect.objectContaining({
          type: 'dashboard',
          title: 'System Overview',
          permissions: ['saved_object:dashboard/get'],
        }),
      ],
    });
    expect(result?.chunks[0].content).toContain('System Overview');
    expect(result?.chunks[0].content).toContain('Main dashboard for key metrics');
    expect(result?.chunks[0].content).toContain('CPU Usage');
    expect(result?.chunks[0].content).toContain('Operations');
    expect(result?.chunks[0].content).toContain('2 panels');
    expect(result?.chunks[0].content).toContain('1 sections');
  });

  it('converts saved dashboards into dashboard attachments with origin', async () => {
    const { savedObjectsClient } = createSavedObjectsClient();

    const result = await dashboardSmlType.toAttachment(
      {
        id: 'chunk-1',
        type: 'dashboard',
        title: 'System Overview',
        origin_id: 'dashboard-1',
        content: '...',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        spaces: ['default'],
        permissions: ['saved_object:dashboard/get'],
      },
      {
        savedObjectsClient,
        request: {} as never,
        spaceId: 'default',
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        type: DASHBOARD_ATTACHMENT_TYPE,
        origin: 'dashboard-1',
        data: expect.objectContaining({
          title: 'System Overview',
          description: 'Main dashboard for key metrics',
        }),
      })
    );
    const attachmentData = result?.data as DashboardAttachmentData | undefined;

    expect(attachmentData?.panels).toHaveLength(2);
    expect(attachmentData?.panels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          uid: 'panel-1',
          type: 'lens',
        }),
        expect.objectContaining({
          uid: 'section-1',
          title: 'Operations',
          panels: [expect.objectContaining({ uid: 'panel-2', type: 'markdown' })],
        }),
      ])
    );
  });

  it('falls back to generic panel storage when a lens panel is already in API format', async () => {
    const { savedObjectsClient } = createSavedObjectsClient();

    (savedObjectsClient.resolve as jest.Mock).mockResolvedValueOnce({
      saved_object: {
        id: 'dashboard-2',
        attributes: dashboardWithLensApiAttributes,
        references: [],
      },
    });

    const result = await dashboardSmlType.toAttachment(
      {
        id: 'chunk-2',
        type: 'dashboard',
        title: 'API Lens Dashboard',
        origin_id: 'dashboard-2',
        content: '...',
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
        spaces: ['default'],
        permissions: ['saved_object:dashboard/get'],
      },
      {
        savedObjectsClient,
        request: {} as never,
        spaceId: 'default',
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        type: DASHBOARD_ATTACHMENT_TYPE,
        origin: 'dashboard-2',
      })
    );
    const attachmentData = result?.data as DashboardAttachmentData | undefined;

    expect(attachmentData?.panels).toEqual([
      expect.objectContaining({
        uid: 'panel-3',
        type: 'lens',
        config: expect.objectContaining({
          attributes: expect.objectContaining({
            type: 'lnsXY',
            title: 'Request Rate',
          }),
        }),
      }),
    ]);
  });
});
