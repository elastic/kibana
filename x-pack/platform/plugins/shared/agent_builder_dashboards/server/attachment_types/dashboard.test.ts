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
} from '@kbn/agent-builder-dashboards-common';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createDashboardAttachmentType } from './dashboard';
import { SURFACE_BASE_URL, renderSurface, surfaceContext } from './test_utils';

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
    create: jest.fn(),
    update: jest.fn(),
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
  it('resolve should return dashboard attachement', async () => {
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

    expect(result).toEqual(
      expect.objectContaining({
        title: 'System Overview',
        description: 'Main dashboard for key metrics',
      })
    );
    expect(result?.panels).toHaveLength(1);
  });

  it('isStale should return true when the dashboard changed after the snapshot', async () => {
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
  });

  it('isStale should return false when the dashboard has not changed', async () => {
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
      create: jest.fn(),
      update: jest.fn(),
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

  describe('toSurfaceComposition', () => {
    const definition = createDashboardAttachmentType({
      logger: createLogger(),
      getDashboardClient: async () => createDashboardClient(),
    });

    const panel = (id: string, config: Record<string, unknown> = {}) => ({
      type: LENS_EMBEDDABLE_TYPE,
      id,
      grid: { x: 0, y: 0, w: 24, h: 15 },
      config,
    });

    const toComposition = async (data: DashboardAttachmentData, origin?: string) =>
      definition.toSurfaceComposition?.(
        { id: 'att-1', type: DASHBOARD_ATTACHMENT_TYPE, data, origin },
        surfaceContext
      );

    it('renders a saved dashboard as a card with its panels and a link', async () => {
      const composition = await toComposition(
        {
          title: 'System Overview',
          description: 'Main dashboard for key metrics',
          time_range: { from: 'now-24h', to: 'now' },
          panels: [panel('panel-1', { title: 'CPU Usage' }), panel('panel-2')],
        },
        'dashboard 1'
      );

      expect(composition?.title).toBe('System Overview');
      expect(composition?.body).toEqual([
        { type: 'markdown', text: 'Main dashboard for key metrics' },
        { type: 'context', items: [{ text: '2 panels' }, { text: 'now-24h to now' }] },
        {
          type: 'table',
          columns: [{ label: 'Panel' }, { label: 'Type' }],
          rows: [
            ['CPU Usage', LENS_EMBEDDABLE_TYPE],
            [null, LENS_EMBEDDABLE_TYPE],
          ],
        },
        {
          type: 'actions',
          buttons: [{ label: 'Open dashboard', app: 'dashboards', path: '#/view/dashboard%201' }],
        },
      ]);

      const { valid, errors, slack } = await renderSurface(composition);

      expect(errors).toEqual([]);
      expect(valid).toBe(true);
      expect(slack).toContain('CPU Usage');
      expect(slack).toContain(`${SURFACE_BASE_URL}/app/dashboards#/view/dashboard%201`);
    });

    it('names the section of each panel when the dashboard has sections', async () => {
      const composition = await toComposition({
        title: 'Sections',
        panels: [
          panel('panel-1', { title: 'Overview' }),
          {
            id: 'section-1',
            title: 'Hosts',
            collapsed: false,
            grid: { y: 15 },
            panels: [panel('panel-2', { title: 'Memory' })],
          },
        ],
      });

      expect(composition?.body).toEqual([
        { type: 'context', items: [{ text: '2 panels' }] },
        {
          type: 'table',
          columns: [{ label: 'Panel' }, { label: 'Type' }, { label: 'Section' }],
          rows: [
            ['Overview', LENS_EMBEDDABLE_TYPE, null],
            ['Memory', LENS_EMBEDDABLE_TYPE, 'Hosts'],
          ],
        },
      ]);

      expect((await renderSurface(composition)).valid).toBe(true);
    });

    it('renders an empty, unsaved dashboard without a table or a link', async () => {
      const composition = await toComposition({ title: 'Empty', panels: [] });

      expect(composition?.body).toEqual([{ type: 'context', items: [{ text: '0 panels' }] }]);
      expect((await renderSurface(composition)).valid).toBe(true);
    });
  });
});
