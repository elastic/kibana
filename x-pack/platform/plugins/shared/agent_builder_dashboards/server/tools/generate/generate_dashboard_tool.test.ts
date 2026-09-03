/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import { retrieveLatestVersion } from './attachment_state';
import { executeDashboardOperations } from './core';
import { generateDashboardTool } from './generate_dashboard_tool';
import { applyDefaultDashboardTimeRange } from './time_range';

jest.mock('./core', () => {
  const actual = jest.requireActual('./core');
  return {
    ...actual,
    executeDashboardOperations: jest.fn(),
    createVisPanelResolver: jest.fn(() => jest.fn()),
  };
});

jest.mock('./time_range', () => ({
  applyDefaultDashboardTimeRange: jest.fn(async ({ dashboardData }) => dashboardData),
}));

jest.mock('./attachment_state', () => ({
  retrieveLatestVersion: jest.fn(),
}));

jest.mock('@kbn/custom-content-server', () => ({
  createCustomContentTemplateResolver: jest.fn(() => jest.fn()),
}));

const mockedExecuteDashboardOperations = jest.mocked(executeDashboardOperations);
const mockedApplyDefaultDashboardTimeRange = jest.mocked(applyDefaultDashboardTimeRange);
const mockedRetrieveLatestVersion = jest.mocked(retrieveLatestVersion);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('generateDashboardTool', () => {
  const tool = generateDashboardTool();

  beforeEach(() => {
    mockedExecuteDashboardOperations.mockReset();
    mockedApplyDefaultDashboardTimeRange.mockClear();
    mockedRetrieveLatestVersion.mockReset();
    mockedRetrieveLatestVersion.mockReturnValue({
      version: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      content_hash: 'hash',
      data: { title: 'Existing', panels: [] },
    });
  });

  it('rejects an empty operations array', () => {
    expect(tool.schema.safeParse({ operations: [] }).success).toBe(false);
  });

  it('accepts a call whose only operation is normalize_panels', () => {
    const parsed = tool.schema.safeParse({
      dashboardAttachmentId: 'dash-1',
      operations: [{ operation: 'normalize_panels' }],
    });

    expect(parsed.success).toBe(true);
  });

  it('accepts set_layout with auto or rows, but not both or neither', () => {
    expect(
      tool.schema.safeParse({
        operations: [{ operation: 'set_layout', auto: true }],
      }).success
    ).toBe(true);
    expect(
      tool.schema.safeParse({
        operations: [{ operation: 'set_layout', rows: [['kpi']] }],
      }).success
    ).toBe(true);
    expect(tool.schema.safeParse({ operations: [{ operation: 'set_layout' }] }).success).toBe(
      false
    );
    expect(
      tool.schema.safeParse({
        operations: [{ operation: 'set_layout', auto: true, rows: [['kpi']] }],
      }).success
    ).toBe(false);
  });

  it('rejects the retired layout operations', () => {
    expect(
      tool.schema.safeParse({
        operations: [{ operation: 'add_section', title: 'Overview', grid: { y: 0 } }],
      }).success
    ).toBe(false);
    expect(
      tool.schema.safeParse({
        operations: [{ operation: 'update_panel_layouts', panels: [] }],
      }).success
    ).toBe(false);
    expect(
      tool.schema.safeParse({
        operations: [{ operation: 'remove_section', id: 'section-a', panelAction: 'promote' }],
      }).success
    ).toBe(false);
  });

  const runHandler = async (operations: Array<{ operation: string } & Record<string, unknown>>) => {
    const attachments = {
      add: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'dash-1', current_version: 2 }),
    };

    const result = await tool.handler(
      {
        dashboardAttachmentId: 'dash-1',
        operations: operations as never,
      },
      {
        logger: createMockLogger(),
        attachments,
        events: { reportProgress: jest.fn() },
        esClient: {},
        modelProvider: {},
      } as never
    );

    return { result, attachments };
  };

  it('applies the default time range only when a request panel was created or data-edited', async () => {
    mockedExecuteDashboardOperations.mockResolvedValue({
      dashboardData: { title: 'Existing', panels: [] },
      failures: [],
      panelAuthoringNotes: [],
      touchedRequestPanelData: true,
      panelKeys: new Map(),
      normalizeChanges: [],
      normalizeSkipped: [],
      layoutRows: [],
      layoutWarnings: [],
    });

    await runHandler([{ operation: 'add_panels', panels: [] }]);

    expect(mockedApplyDefaultDashboardTimeRange).toHaveBeenCalledTimes(1);
  });

  it('does not apply the default time range for a normalize-only call', async () => {
    mockedExecuteDashboardOperations.mockResolvedValue({
      dashboardData: { title: 'Existing', panels: [] },
      failures: [],
      panelAuthoringNotes: [],
      touchedRequestPanelData: false,
      panelKeys: new Map(),
      normalizeChanges: [],
      normalizeSkipped: [],
      layoutRows: [],
      layoutWarnings: [],
    });

    await runHandler([{ operation: 'normalize_panels' }]);

    expect(mockedApplyDefaultDashboardTimeRange).not.toHaveBeenCalled();
  });

  it('returns the richer panel summary including source, chart_type, title, hide_title, and key', async () => {
    mockedExecuteDashboardOperations.mockResolvedValue({
      dashboardData: {
        title: 'Pretty',
        panels: [
          {
            id: 'esql-1',
            type: LENS_EMBEDDABLE_TYPE,
            config: {
              type: 'metric',
              title: 'Requests',
              hide_title: true,
              data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*)' },
            },
            grid: { x: 0, y: 0, w: 12, h: 5 },
          },
          {
            id: 'dsl-1',
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'xy', title: 'Latency' },
            grid: { x: 12, y: 0, w: 24, h: 10 },
          },
          {
            id: 'md-1',
            type: MARKDOWN_EMBEDDABLE_TYPE,
            config: { content: 'Notes' },
            grid: { x: 0, y: 10, w: 48, h: 4 },
          },
        ],
      },
      failures: [],
      panelAuthoringNotes: [],
      touchedRequestPanelData: false,
      panelKeys: new Map([['requests', 'esql-1']]),
      normalizeChanges: [{ panelId: 'esql-1', id: 'T1' }],
      normalizeSkipped: [{ id: 'md-1', reason: 'not_lens' }],
      layoutRows: [['esql-1', 'dsl-1'], ['md-1']],
      layoutWarnings: [{ panelId: 'esql-1', message: 'lone metric/gauge/pie uses default width' }],
    });

    const { result } = await runHandler([{ operation: 'normalize_panels' }]);

    expect(result).toEqual({
      results: [
        expect.objectContaining({
          type: ToolResultType.dashboard,
          data: {
            attachment_id: 'dash-1',
            version: 2,
            dashboard: expect.objectContaining({
              title: 'Pretty',
              panels: [
                {
                  id: 'esql-1',
                  key: 'requests',
                  title: 'Requests',
                  chart_type: 'metric',
                  source: 'esql',
                  hide_title: true,
                  grid: { x: 0, y: 0, w: 12, h: 5 },
                  row: 0,
                  authoring_note: undefined,
                  warnings: ['lone metric/gauge/pie uses default width'],
                },
                {
                  id: 'dsl-1',
                  title: 'Latency',
                  chart_type: 'xy',
                  source: 'dsl',
                  grid: { x: 12, y: 0, w: 24, h: 10 },
                  row: 0,
                  authoring_note: undefined,
                },
                {
                  id: 'md-1',
                  title: undefined,
                  chart_type: MARKDOWN_EMBEDDABLE_TYPE,
                  source: 'other',
                  grid: { x: 0, y: 10, w: 48, h: 4 },
                  row: 1,
                  authoring_note: undefined,
                },
              ],
            }),
            rows: [['esql-1', 'dsl-1'], ['md-1']],
            changes: [{ panelId: 'esql-1', id: 'T1' }],
            skipped: [{ id: 'md-1', reason: 'not_lens' }],
          },
        }),
      ],
    });
  });
});
