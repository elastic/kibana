/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { ApiClientFixture, RoleApiCredentials } from '@kbn/scout';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import { dashboardTools } from '../../../../common/constants';
import {
  apiTest,
  answerNextLayoutCall,
  callGenerateDashboard,
  createAppDashboard,
  dashboardAuthorRole,
  deleteDashboards,
  GENERATE_DASHBOARD_MCP_NAME,
  markdownPanel,
  readAppDashboard,
  readDashboard,
  resultOfType,
  testData,
  withMcpClient,
  type DashboardToolResult,
} from '../fixtures';

const RUN_ID = randomUUID().replaceAll('-', '').slice(0, 12);

// A TSVB panel has no panel schema, so the public dashboards API leaves it out.
const tsvbPanel = {
  type: VISUALIZE_EMBEDDABLE_TYPE,
  id: 'tsvb',
  grid: { x: 0, y: 0, w: 24, h: 8 },
  config: {
    savedVis: {
      title: 'TSVB',
      description: '',
      type: 'metrics',
      params: {
        type: 'timeseries',
        index_pattern: 'logs-*',
        series: [{ id: 'series-1', metrics: [{ id: 'metric-1', type: 'count' }] }],
      },
      uiState: {},
      data: { aggs: [], searchSource: {} },
    },
  },
};

// The by-value Lens panel of the flights sample dashboard, whose attributes carry `type: 'lens'`.
const lensAttributesPanel = {
  type: LENS_EMBEDDABLE_TYPE,
  id: 'lens',
  grid: { x: 24, y: 0, w: 8, h: 8 },
  config: {
    hide_title: true,
    attributes: {
      title: '[Flights] Total Flights',
      description: '',
      visualizationType: 'lnsMetric',
      type: 'lens',
      references: [
        {
          type: 'index-pattern',
          id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
          name: 'indexpattern-datasource-layer-8fa993db-c147-4954-adf7-4ff264d42576',
        },
      ],
      state: {
        visualization: {
          layerId: '8fa993db-c147-4954-adf7-4ff264d42576',
          layerType: 'data',
          metricAccessor: '81124c45-6ab6-42f4-8859-495d55eb8065',
        },
        query: { query: '', language: 'kuery' },
        filters: [],
        datasourceStates: {
          formBased: {
            layers: {
              '8fa993db-c147-4954-adf7-4ff264d42576': {
                columns: {
                  '81124c45-6ab6-42f4-8859-495d55eb8065': {
                    label: 'Total flights',
                    dataType: 'number',
                    operationType: 'count',
                    isBucketed: false,
                    scale: 'ratio',
                    sourceField: '___records___',
                    customLabel: true,
                  },
                },
                columnOrder: ['81124c45-6ab6-42f4-8859-495d55eb8065'],
                incompleteColumns: {},
              },
            },
          },
        },
        internalReferences: [],
        adHocDataViews: {},
      },
    },
  },
};

interface AppPanel {
  id: string;
  type: string;
  config: unknown;
}

apiTest.describe(
  'generate_dashboard tool over MCP (default space)',
  { tag: tags.stateful.classic },
  () => {
    let credentials: RoleApiCredentials;
    let mcpUrl: string;
    const createdIds = new Set<string>();

    const asMcp = <T>(fn: (client: Client) => Promise<T>) =>
      withMcpClient({ url: mcpUrl, headers: credentials.apiKeyHeader }, fn);

    const generate = (args: Record<string, unknown>) =>
      asMcp((client) => callGenerateDashboard(client, args));

    /** The panels as the Dashboard app loads them, without their grid, by panel id. */
    const readAppPanels = async (apiClient: ApiClientFixture, id: string) => {
      const response = await readAppDashboard(apiClient, credentials, id);
      expect(response).toHaveStatusCode(200);
      const panels: AppPanel[] = response.body.data.panels;
      return new Map(panels.map(({ id: panelId, type, config }) => [panelId, { type, config }]));
    };

    apiTest.beforeAll(async ({ requestAuth, kbnUrl }) => {
      credentials = await requestAuth.getApiKeyForCustomRole(dashboardAuthorRole('default'));
      mcpUrl = kbnUrl.get(testData.MCP_PATH);
    });

    apiTest.afterEach(({ layoutModel }) => {
      layoutModel.proxy.clear();
    });

    apiTest.afterAll(async ({ kbnClient }) => {
      await deleteDashboards(kbnClient, createdIds);
    });

    apiTest(
      'lists the registry tool as a non-idempotent, closed-world write',
      async ({ apiClient }) => {
        const { tools } = await asMcp((client) => client.listTools());
        const tool = tools.find(({ name }) => name === GENERATE_DASHBOARD_MCP_NAME);

        expect(tool?.annotations).toMatchObject({
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: false,
        });
        expect(tool?.annotations?.title).toMatch(/\S/);

        const registryTool = await apiClient.get(
          `${testData.TOOLS_PATH}/${encodeURIComponent(dashboardTools.generateDashboard)}`,
          {
            headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
            responseType: 'json',
          }
        );
        expect(registryTool).toHaveStatusCode(200);
        expect(registryTool.body.id).toBe(dashboardTools.generateDashboard);
      }
    );

    apiTest(
      'saves a new dashboard, then overwrites the same one when called with its id',
      async ({ apiClient, layoutModel }) => {
        const first = { title: `MCP dashboard ${RUN_ID}`, text: `Intro ${RUN_ID}` };
        const second = { title: `MCP dashboard renamed ${RUN_ID}`, text: `Details ${RUN_ID}` };

        const dashboardId = await apiTest.step('creates the dashboard', async () => {
          answerNextLayoutCall(layoutModel.proxy);
          const created = resultOfType<DashboardToolResult>(
            await generate({
              title: first.title,
              description: 'Created over MCP',
              panels: [markdownPanel('intro', first.text)],
            }),
            'dashboard'
          );
          createdIds.add(created.dashboard_id);

          expect(created.dashboard_id).toMatch(/\S/);
          expect(created.url).toContain(`/app/dashboards#/view/${created.dashboard_id}`);
          expect(created.url).not.toContain('/s/');
          expect(Object.keys(created)).not.toContain('attachment_id');
          expect(created.created).toStrictEqual(['intro']);

          const saved = await readDashboard(apiClient, credentials, created.dashboard_id);
          expect(saved).toHaveStatusCode(200);
          expect(saved.body.data.title).toBe(first.title);
          expect(saved.body.data.description).toBe('Created over MCP');
          expect(saved.body.data.panels).toStrictEqual([
            expect.objectContaining({
              type: 'markdown',
              config: expect.objectContaining({ content: first.text }),
            }),
          ]);
          return created.dashboard_id;
        });

        await apiTest.step('updates it in place', async () => {
          answerNextLayoutCall(layoutModel.proxy);
          const updated = resultOfType<DashboardToolResult>(
            await generate({
              dashboardId,
              title: second.title,
              panels: [markdownPanel('details', second.text)],
            }),
            'dashboard'
          );

          expect(updated.dashboard_id).toBe(dashboardId);
          expect(updated.created).toStrictEqual(['details']);
          expect(updated.removed).toStrictEqual([]);
          expect(updated.url).toContain(`/app/dashboards#/view/${dashboardId}`);

          const saved = await readDashboard(apiClient, credentials, dashboardId);
          expect(saved).toHaveStatusCode(200);
          expect(saved.body.data.title).toBe(second.title);
          const contents = (saved.body.data.panels as Array<{ config: { content?: string } }>).map(
            ({ config }) => config.content
          );
          expect(contents).toHaveLength(2);
          expect(contents).toStrictEqual(expect.arrayContaining([first.text, second.text]));
        });
      }
    );

    apiTest(
      'keeps panels the public API cannot express when it updates a dashboard',
      async ({ apiClient, layoutModel }) => {
        const dashboardId = await apiTest.step(
          'saves a TSVB and a by-value Lens panel in the Dashboard app',
          async () => {
            const seeded = await createAppDashboard(apiClient, credentials, {
              title: `MCP app dashboard ${RUN_ID}`,
              panels: [tsvbPanel, lensAttributesPanel],
            });
            expect(seeded).toHaveStatusCode(201);
            createdIds.add(seeded.body.id);
            return seeded.body.id as string;
          }
        );

        const panelsBefore = await readAppPanels(apiClient, dashboardId);

        await apiTest.step('adds a panel over MCP', async () => {
          answerNextLayoutCall(layoutModel.proxy);
          const updated = resultOfType<DashboardToolResult>(
            await generate({ dashboardId, panels: [markdownPanel('notes', `Notes ${RUN_ID}`)] }),
            'dashboard'
          );

          expect(updated.dashboard_id).toBe(dashboardId);
          expect(updated.created).toStrictEqual(['notes']);
          expect(updated.removed).toStrictEqual([]);
          expect(updated.failures).toBeUndefined();
        });

        await apiTest.step(
          'keeps the existing panels as the Dashboard app loads them',
          async () => {
            const panelsAfter = await readAppPanels(apiClient, dashboardId);

            expect(panelsAfter.get('tsvb')).toStrictEqual(panelsBefore.get('tsvb'));
            expect(panelsAfter.get('lens')).toStrictEqual(panelsBefore.get('lens'));
            expect(panelsAfter.get('notes')?.type).toBe('markdown');
            expect(await readDashboard(apiClient, credentials, dashboardId)).toHaveStatusCode(200);
          }
        );
      }
    );

    apiTest(
      'reports attachment panels as needing an Agent Builder conversation',
      async ({ apiClient, layoutModel }) => {
        const attachmentPanel = {
          id: 'from-attachment',
          content: { source: 'attachment', attachment_id: `missing-${RUN_ID}` },
        };

        await apiTest.step('saves the other panels and lists the attachment failure', async () => {
          answerNextLayoutCall(layoutModel.proxy);
          const result = resultOfType<DashboardToolResult>(
            await generate({
              title: `MCP mixed ${RUN_ID}`,
              panels: [markdownPanel('kept', `Kept ${RUN_ID}`), attachmentPanel],
            }),
            'dashboard'
          );
          createdIds.add(result.dashboard_id);

          expect(result.created).toStrictEqual(['kept']);
          expect(result.failures).toHaveLength(1);
          expect(result.failures?.[0].identifier).toBe('from-attachment');
          expect(result.failures?.[0].error).toMatch(/Agent Builder conversation/i);
          const saved = await readDashboard(apiClient, credentials, result.dashboard_id);
          expect(saved).toHaveStatusCode(200);
          expect(saved.body.data.panels).toStrictEqual([
            expect.objectContaining({ type: 'markdown' }),
          ]);
        });

        await apiTest.step('returns an error and saves nothing when no panel is left', async () => {
          const title = `mcpattachmentonly${RUN_ID}`;
          const envelope = await generate({ title, panels: [attachmentPanel] });

          expect(envelope.results.map(({ type }) => type)).toStrictEqual(['error']);
          const error = resultOfType<{ message: string }>(envelope, 'error');
          expect(error.message).toMatch(/\S/);
          expect(JSON.stringify(error)).toMatch(/Agent Builder conversation/i);

          const search = await apiClient.get(`${testData.DASHBOARDS_PATH}?query=${title}`, {
            headers: { ...testData.COMMON_HEADERS, ...credentials.apiKeyHeader },
            responseType: 'json',
          });
          expect(search).toHaveStatusCode(200);
          expect(
            (search.body.data as Array<{ data: { title: string } }>).map(({ data }) => data.title)
          ).not.toContain(title);
        });
      }
    );
  }
);
