/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment-timezone';
import type { IUiSettingsClient } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { Filter } from '@kbn/es-query';
import type { GridNode, MetricNode, XyChartNode } from '@kbn/isomer';
import { metricExamples, xyChartExamples } from '@kbn/isomer';
import type { MaterializeContext } from '../../../common';
import { createTestKitServices } from '../../materialize/kit/kit_services.mock';
import { createScopedMaterializeClient } from '../../materialize/materialize_client';
import type { UnsupportedNode } from '../../materialize/nodes';
import { MaterializerRegistry } from '../../materialize/registry';
import type { MaterializeScope, Materializer } from '../../materialize/types';
import { createNodeValidator } from '../../materialize/validate_node';
import { createDashboardMaterializer } from './dashboard_materializer';
import { logsDashboardRead, logsDroppedAppPanels } from './fixtures/logs_dashboard';

const NOW = new Date('2025-01-15T12:00:00.000Z');
const USER_TIME_ZONE = 'America/New_York';

/** How Kibana's browser resolves a range, with moment's default zone set to `dateFormat:tz`. */
const browserResolve = (from: string, to: string, timeZone: string) => {
  moment.tz.setDefault(timeZone);
  try {
    return {
      from: dateMath.parse(from, { forceNow: NOW })!.toISOString(),
      to: dateMath.parse(to, { roundUp: true, forceNow: NOW })!.toISOString(),
    };
  } finally {
    moment.tz.setDefault();
  }
};
const LOGS_ID = 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b';
const LOGS_DATA_VIEW = '90943e30-9a47-11e8-b64d-95841ca0b247';
const KIBANA_URL = 'https://kibana.example.com/s/marketing';
const LOGS_LINK = {
  href: `${KIBANA_URL}/app/dashboards#/view/${LOGS_ID}`,
  label: 'Open in Kibana',
};

const metric = metricExamples[0].node as MetricNode;
const xySeries = xyChartExamples[0].node as XyChartNode;

interface LensStubConfig {
  title?: string;
  rows?: number;
}

/** Stands in for the Lens materializer: a metric for every config, failing for one title. */
const createLensStub = () => {
  const contexts: MaterializeContext[] = [];
  const materializer: Materializer<LensStubConfig> = {
    version: 1,
    parse: (config) => config as LensStubConfig,
    describe: ({ title }) => ({ title }),
    plan: (_config, context) => {
      contexts.push(context);
      return [];
    },
    map: ({ title, rows }) => {
      if (title === '[Logs] Errors by host') {
        throw new Error('The query timed out.');
      }
      if (rows) {
        const [time, count] = xySeries.data.rows[0] as [number, number];
        return {
          ...xySeries,
          data: {
            ...xySeries.data,
            rows: Array.from({ length: rows }, (_, index) => [time + index, count]),
          },
        };
      }
      return { ...metric, ...(title ? { title } : {}) };
    },
  };
  return { materializer, contexts };
};

const dataView = createStubDataView({
  spec: {
    id: LOGS_DATA_VIEW,
    title: 'kibana_sample_data_logs',
    timeFieldName: 'timestamp',
    fields: {
      'geo.src': {
        name: 'geo.src',
        type: 'string',
        esTypes: ['keyword'],
        aggregatable: true,
        searchable: true,
      },
    },
  },
});

type DashboardData = Record<string, unknown> & { panels: unknown[] };

const setup = ({ dashboardData = logsDashboardRead.data as DashboardData } = {}) => {
  const read = jest.fn(async (_client: unknown, _id: string, options?: object) =>
    options
      ? {
          id: LOGS_ID,
          data: { ...dashboardData, panels: [...dashboardData.panels, ...logsDroppedAppPanels] },
        }
      : { id: LOGS_ID, data: dashboardData, warnings: logsDashboardRead.warnings }
  );
  const dashboard = { client: { read } } as unknown as DashboardPluginStart;
  const savedObjectsClient = savedObjectsClientMock.create();
  savedObjectsClient.bulkGet.mockImplementation(async (objects) => ({
    saved_objects: objects.map(({ type, id }) => ({
      type,
      id,
      references: [],
      attributes: { title: `Saved ${type} ${id}` },
    })),
  }));
  const scope: MaterializeScope = {
    request: httpServerMock.createKibanaRequest(),
    savedObjectsClient,
    abortSignal: new AbortController().signal,
  };
  const lens = createLensStub();
  const registry = new MaterializerRegistry();
  registry.register('lens', lens.materializer);
  registry.register(
    'dashboard',
    createDashboardMaterializer({
      getDashboard: async () => dashboard,
      getDataViews: async () =>
        ({
          get: async (id: string) => {
            if (id !== LOGS_DATA_VIEW) {
              throw new Error(`Data view [${id}] not found`);
            }
            return dataView;
          },
        } as unknown as DataViewsService),
      getUiSettings: () =>
        ({
          get: async (key: string) =>
            ({
              'timepicker:timeDefaults': { from: 'now-15m', to: 'now' },
              'dateFormat:tz': USER_TIME_ZONE,
            }[key]),
        } as unknown as IUiSettingsClient),
      getKibanaUrl: () => KIBANA_URL,
      now: () => NOW,
    })
  );
  const client = createScopedMaterializeClient({
    registry,
    scope,
    isEnabled: async () => true,
    logger: loggingSystemMock.createLogger(),
    search: { esql: jest.fn() },
    validate: createNodeValidator(),
    getKitServices: createTestKitServices,
    getSelectionServices: jest.fn(),
    kibanaVersion: '9.7.0',
    now: () => NOW,
  });
  return { client, read, lens, savedObjectsClient };
};

const panelById = (grid: GridNode, id: string) => {
  const panel = grid.panels.find((candidate) => candidate.id === id);
  if (!panel) {
    throw new Error(`No panel ${id}`);
  }
  return panel;
};

describe('the dashboard materializer', () => {
  it('materializes the Logs sample dashboard into a grid at its panel positions', async () => {
    const { client } = setup();
    const grid = (await client.materialize({ type: 'dashboard', id: LOGS_ID })) as GridNode;

    expect(grid.type).toBe('grid');
    expect(grid.title).toBe('[Logs] Web Traffic');
    expect(grid.description).toBe("Analyze mock web traffic log data for Elastic's website");
    expect(grid.panels.map(({ id, x, y, w, h }) => ({ id, x, y, w, h }))).toEqual([
      { id: '11', x: 36, y: 0, w: 12, h: 7 },
      { id: '15', x: 0, y: 7, w: 24, h: 7 },
      { id: 'bb94016e-f4a6-49ca-87a9-296a2869d570', x: 24, y: 0, w: 12, h: 7 },
      { id: '8c1456d4-1993-4ba2-b701-04aca02c9fef', x: 36, y: 7, w: 12, h: 7 },
      { id: '01d8e435-91c0-484f-a11e-856747050b0a', x: 24, y: 7, w: 12, h: 7 },
      { id: '21bb0939-ee09-4021-8848-6552b3a6a788', x: 0, y: 47, w: 24, h: 13 },
      { id: 'cbca842c-b9fa-4523-9ce0-14e350866e33', x: 24, y: 47, w: 24, h: 13 },
      { id: '1d5f0b3f-d9d2-4b26-997b-83bc5ca3090b', x: 0, y: 60, w: 48, h: 19 },
      { id: '4', x: 0, y: 14, w: 24, h: 18 },
      { id: '14', x: 24, y: 14, w: 24, h: 33 },
      { id: '343f0bef-0b19-452e-b1c8-59beb18b6f0c', x: 0, y: 0, w: 24, h: 7 },
      { id: '8e59c7cf-6e42-4343-a113-c4a255fcf2ce', x: 0, y: 32, w: 24, h: 15 },
    ]);
  });

  it('carries panel titles apart from chart nodes, as the panel header shows them', async () => {
    const { client } = setup();
    const grid = (await client.materialize({ type: 'dashboard', id: LOGS_ID })) as GridNode;

    const titled = panelById(grid, '15');
    expect(titled.title).toBe('[Logs] Response Codes Over Time + Annotations');
    expect(titled.node).toEqual(
      expect.objectContaining({
        type: 'metric',
        source: expect.objectContaining({ meta: expect.objectContaining({ panelId: '15' }) }),
      })
    );
    expect(titled.node).not.toHaveProperty('title');
    // An empty title and a hidden title show no header.
    expect(panelById(grid, '11')).not.toHaveProperty('title');
    expect(panelById(grid, '8c1456d4-1993-4ba2-b701-04aca02c9fef')).not.toHaveProperty('title');
  });

  it('keeps a failed panel as a placeholder, and returns the rest', async () => {
    const { client } = setup();
    const grid = (await client.materialize({ type: 'dashboard', id: LOGS_ID })) as GridNode;

    const failed = panelById(grid, '1d5f0b3f-d9d2-4b26-997b-83bc5ca3090b');
    expect(failed.title).toBe('[Logs] Errors by host');
    expect(failed.node).toEqual({
      type: 'unsupported',
      title: '[Logs] Errors by host',
      reason: 'Materializing this lens failed: The query timed out.',
      link: LOGS_LINK,
    });
  });

  it('recovers the panels the Dashboard API drops as placeholders in their places', async () => {
    const { client, read } = setup();
    const grid = (await client.materialize({ type: 'dashboard', id: LOGS_ID })) as GridNode;

    expect(read).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenLastCalledWith(expect.anything(), LOGS_ID, {
      isDashboardAppRequest: true,
    });
    const map = panelById(grid, '4');
    expect(map.title).toBe('Saved map de71f4f0-1902-11e9-919b-ffe5949a18d2');
    expect(map.node).toEqual({
      type: 'unsupported',
      title: 'Saved map de71f4f0-1902-11e9-919b-ffe5949a18d2',
      reason: 'Kibana cannot materialize saved objects of type "map".',
      link: LOGS_LINK,
    });
    expect((panelById(grid, '14').node as UnsupportedNode).reason).toBe(
      'Kibana cannot materialize saved objects of type "visualization".'
    );
    const markdown = panelById(grid, '343f0bef-0b19-452e-b1c8-59beb18b6f0c');
    expect(markdown).not.toHaveProperty('title');
    expect(markdown.node).toEqual({
      type: 'unsupported',
      title: '[Logs] Markdown Instructions',
      reason: 'Kibana cannot materialize "legacy_vis" panels stored inside a dashboard.',
      link: LOGS_LINK,
    });
  });

  it("runs each panel in the dashboard's context, with its controls' selections as filters", async () => {
    const [country, ...otherControls] = logsDashboardRead.data.pinned_panels;
    const dashboardData = {
      ...logsDashboardRead.data,
      pinned_panels: [
        { ...country, config: { ...country.config, selected_options: ['US'] } },
        ...otherControls,
      ],
    };
    const { client, lens } = setup({ dashboardData });
    await client.materialize({ type: 'dashboard', id: LOGS_ID });

    expect(lens.contexts).toHaveLength(8);
    for (const context of lens.contexts) {
      // The dashboard's saved `now-7d/d` to `now`, rounded in the user's `dateFormat:tz`.
      expect(context.timeRange).toEqual(browserResolve('now-7d/d', 'now', USER_TIME_ZONE));
      expect(context.timeRange?.from).toBe('2025-01-08T05:00:00.000Z');
      expect(context.query).toEqual({ query: '', language: 'kuery' });
      expect(context.filters).toEqual([
        {
          meta: {
            controlledBy: country.id,
            index: LOGS_DATA_VIEW,
            key: 'geo.src',
          },
          query: { match_phrase: { 'geo.src': 'US' } },
        } as Filter,
      ]);
    }
  });

  it('materializes a dashboard by value, without a link or recovered panels', async () => {
    const { client, read } = setup();
    const grid = (await client.materialize({
      type: 'dashboard',
      config: logsDashboardRead.data,
    })) as GridNode;

    expect(read).not.toHaveBeenCalled();
    expect(grid.panels).toHaveLength(8);
    expect(panelById(grid, '1d5f0b3f-d9d2-4b26-997b-83bc5ca3090b').node).not.toHaveProperty('link');
  });

  it('places panels in their sections', async () => {
    const { client } = setup();
    const grid = (await client.materialize({
      type: 'dashboard',
      config: {
        title: 'Sections',
        panels: [
          { id: 'top', type: 'vis', grid: { x: 0, y: 0, w: 48, h: 5 }, config: { title: 'Top' } },
          {
            id: 'details',
            title: 'Details',
            collapsed: true,
            grid: { y: 5 },
            panels: [
              { id: 'inner', type: 'vis', grid: { x: 0, y: 0, w: 24, h: 5 }, config: {} },
              { id: 'note', type: 'markdown', grid: { x: 24, y: 0, w: 24, h: 5 }, config: {} },
            ],
          },
        ],
      },
    })) as GridNode;

    expect(grid.panels.map(({ id }) => id)).toEqual(['top']);
    expect(grid.sections).toEqual([
      {
        id: 'details',
        title: 'Details',
        collapsed: true,
        y: 5,
        panels: [
          expect.objectContaining({ id: 'inner', x: 0, y: 0, w: 24, h: 5 }),
          expect.objectContaining({
            id: 'note',
            node: {
              type: 'unsupported',
              title: 'Content not available',
              reason: 'Kibana cannot materialize saved objects of type "markdown".',
            },
          }),
        ],
      },
    ]);
  });

  it('replaces the largest panels with placeholders until the grid fits the input budget', async () => {
    const { client } = setup();
    const grid = (await client.materialize({
      type: 'dashboard',
      config: {
        title: 'Large',
        panels: ['a', 'b'].map((id, index) => ({
          id,
          type: 'vis',
          grid: { x: index * 24, y: 0, w: 24, h: 10 },
          config: { title: id, rows: 3500 + index * 100 },
        })),
      },
    })) as GridNode;

    expect(grid.type).toBe('grid');
    const [a, b] = grid.panels.map(({ node }) => node);
    expect(a.type).toBe('xyChart');
    expect(b).toEqual({
      type: 'unsupported',
      title: 'b',
      reason: "This panel's data is too large to show with the rest of the dashboard.",
    });
  });
});
