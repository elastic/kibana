/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createDashboardAttachmentType } from '../../attachment_types/dashboard';
import { generateDashboardTool } from './generate_dashboard_tool';
import { retrieveLatestVersion } from './attachment_state';
import { applyDefaultDashboardTimeRange } from './time_range';

jest.mock('./time_range', () => ({
  applyDefaultDashboardTimeRange: jest.fn(async ({ dashboardData }) => dashboardData),
}));

describe('generateDashboardTool presentation updates', () => {
  const logger = loggingSystemMock.createLogger();
  const definition = createDashboardAttachmentType({ logger, getDashboardClient: jest.fn() });
  const createContext = () => {
    const attachments = createAttachmentStateManager([], {
      getTypeDefinition: () => ({
        id: definition.id,
        validate: definition.validate,
        format: () => ({ getRepresentation: () => ({ type: 'text', value: '' }) }),
      }),
    });
    const esClient = elasticsearchServiceMock.createScopedClusterClient();
    const getDefaultModel = jest.fn();
    const context: Pick<
      ToolHandlerContext,
      'attachments' | 'logger' | 'esClient' | 'events' | 'modelProvider'
    > = {
      attachments,
      logger,
      esClient,
      events: { reportProgress: jest.fn(), sendUiEvent: jest.fn() },
      modelProvider: {
        getDefaultModel,
        selectModel: jest.fn(),
        getModelById: jest.fn(),
        hasFastModel: jest.fn(),
        getUsageStats: jest.fn(),
      },
    };
    return { context: context as ToolHandlerContext, attachments, getDefaultModel, esClient };
  };
  const dashboard: DashboardAttachmentData = {
    title: 'Existing dashboard',
    panels: [
      {
        id: 'panel-1',
        type: LENS_EMBEDDABLE_TYPE,
        grid: { x: 0, y: 0, w: 24, h: 10 },
        config: {
          type: 'xy',
          title: 'Requests',
          layers: [
            {
              type: 'line',
              data_source: { type: 'esql', query: 'ROW count=1' },
              y: [{ column: 'count' }],
            },
          ],
        },
      },
    ],
  };
  const tool = generateDashboardTool();
  const operations = [
    {
      operation: 'edit_panels' as const,
      panels: [
        {
          source: 'config' as const,
          type: 'vis' as const,
          panelId: 'panel-1',
          config: {
            changes: [
              { operation: 'set' as const, path: 'axis.x.title.visible', value: false },
              { operation: 'set' as const, path: 'legend.visibility', value: 'hidden' },
              { operation: 'set' as const, path: 'layers.0.y.0.format.type', value: 'number' },
              { operation: 'set' as const, path: 'layers.0.y.0.format.decimals', value: 0 },
            ],
          },
        },
      ],
    },
  ];

  beforeEach(() => jest.clearAllMocks());

  it.each([undefined, { from: 'now-7d', to: 'now' }])(
    'preserves saved or absent time range without model or ES calls: %j',
    async (timeRange) => {
      const { context, attachments, getDefaultModel, esClient } = createContext();
      const data = { ...dashboard, ...(timeRange ? { time_range: timeRange } : {}) };
      await attachments.add({ id: 'dashboard', type: DASHBOARD_ATTACHMENT_TYPE, data });
      const result = await tool.handler(
        { dashboardAttachmentId: 'dashboard', operations },
        context
      );
      expect(result).toMatchObject({
        results: [{ data: { attachment_id: 'dashboard', version: 2, failures: undefined } }],
      });
      expect(retrieveLatestVersion(attachments, 'dashboard')?.data.time_range).toEqual(timeRange);
      expect(retrieveLatestVersion(attachments, 'dashboard')?.data.panels[0]).toMatchObject({
        config: {
          layers: [{ y: [{ column: 'count', format: { type: 'number', decimals: 0 } }] }],
        },
      });
      expect(applyDefaultDashboardTimeRange).not.toHaveBeenCalled();
      expect(getDefaultModel).not.toHaveBeenCalled();
      expect(esClient.asCurrentUser.esql.query).not.toHaveBeenCalled();
    }
  );

  it('applies edits to the latest attachment and keeps version history', async () => {
    const { context, attachments } = createContext();
    await attachments.add({ id: 'dashboard', type: DASHBOARD_ATTACHMENT_TYPE, data: dashboard });
    const updatedDashboard = { ...dashboard, title: 'Updated dashboard' };
    await attachments.update('dashboard', { data: updatedDashboard });

    const result = await tool.handler({ dashboardAttachmentId: 'dashboard', operations }, context);

    expect(result).toMatchObject({
      results: [{ data: { attachment_id: 'dashboard', version: 3, failures: undefined } }],
    });
    expect(retrieveLatestVersion(attachments, 'dashboard')?.data.title).toBe('Updated dashboard');
    expect(attachments.get('dashboard', { version: 1 })?.data.data).toEqual(dashboard);
    expect(attachments.get('dashboard', { version: 2 })?.data.data).toEqual(updatedDashboard);
  });

  it('does not persist an invalid chart edit or create a new version for it', async () => {
    const { context, attachments } = createContext();
    await attachments.add({ id: 'dashboard', type: DASHBOARD_ATTACHMENT_TYPE, data: dashboard });
    const result = await tool.handler(
      {
        dashboardAttachmentId: 'dashboard',
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'config',
                type: 'vis',
                panelId: 'panel-1',
                config: {
                  changes: [
                    { operation: 'set', path: 'axis.x.title.visible', value: false },
                    { operation: 'set', path: 'legend.visibility', value: 'sometimes' },
                  ],
                },
              },
            ],
          },
        ],
      },
      context
    );
    expect(result).toMatchObject({
      results: [{ data: { version: 1, failures: [{ identifier: 'panel-1' }] } }],
    });
    expect(retrieveLatestVersion(attachments, 'dashboard')?.data).toEqual(dashboard);
  });

  it('still selects a default time range for a new dashboard', async () => {
    const { context } = createContext();
    await tool.handler({ operations: [{ operation: 'set_metadata', title: 'New' }] }, context);
    expect(applyDefaultDashboardTimeRange).toHaveBeenCalledTimes(1);
  });

  it('preserves the existing renderer even when an unrelated wrapper field resembles Vega', async () => {
    const { context, attachments } = createContext();
    const panel = dashboard.panels[0];
    if (!('config' in panel)) throw new Error('Expected a visualization fixture');
    await attachments.add({
      id: 'dashboard',
      type: DASHBOARD_ATTACHMENT_TYPE,
      data: {
        ...dashboard,
        panels: [{ ...panel, config: { ...panel.config, spec: 'unrelated wrapper value' } }],
      },
    });
    await tool.handler({ dashboardAttachmentId: 'dashboard', operations }, context);
    expect(retrieveLatestVersion(attachments, 'dashboard')?.data.panels[0]).toMatchObject({
      type: LENS_EMBEDDABLE_TYPE,
      id: panel.id,
      config: { spec: 'unrelated wrapper value' },
    });
  });
});
