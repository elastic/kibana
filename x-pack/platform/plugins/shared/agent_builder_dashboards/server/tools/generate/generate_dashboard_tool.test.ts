/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { ToolHandlerContext } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';

import { dashboardTools } from '../../../common';
import { createPanelContentResolver } from './core';
import type { DashboardOperation } from './core/operations';
import type { PanelFailure } from './core/utils';
import { generateDashboardTool } from './generate_dashboard_tool';

jest.mock('./core', () => {
  const actual = jest.requireActual('./core');
  return {
    ...actual,
    createPanelContentResolver: jest.fn(),
  };
});

const mockedCreatePanelContentResolver = jest.mocked(createPanelContentResolver);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const createMockAttachments = () => ({
  getAttachmentRecord: jest.fn(),
  add: jest.fn(),
  update: jest.fn(),
});

type MockAttachments = ReturnType<typeof createMockAttachments>;

const createHandlerContext = (attachments: MockAttachments): ToolHandlerContext =>
  ({
    logger: createMockLogger(),
    attachments,
    events: {},
    esClient: {},
    modelProvider: {},
  } as unknown as ToolHandlerContext);

const createDashboardAttachmentRecord = (
  id: string,
  data: DashboardAttachmentData,
  version = 1
): VersionedAttachment => ({
  id,
  type: DASHBOARD_ATTACHMENT_TYPE,
  versions: [
    {
      version,
      data,
      created_at: '2026-01-01T00:00:00.000Z',
      content_hash: 'hash',
      estimated_tokens: 1,
    },
  ],
  current_version: version,
  active: true,
});

/** Shape of the data returned in a successful `generate_dashboard` result. */
interface GenerateDashboardResultData {
  attachment_id: string;
  version: number;
  dashboard: {
    title: string;
    description?: string;
    panels: unknown[];
    [key: string]: unknown;
  };
  section_refs?: Record<string, string>;
  failures?: PanelFailure[];
}

interface ErrorResultData {
  message: string;
  metadata?: Record<string, unknown>;
}

const invokeTool = async (
  args: { dashboardAttachmentId?: string; operations: DashboardOperation[] },
  context: ToolHandlerContext
) => {
  const tool = generateDashboardTool();
  const result = await tool.handler(args, context);
  if (!('results' in result)) {
    throw new Error('Expected a standard tool handler return');
  }
  return result.results as unknown as Array<{
    type: ToolResultType;
    tool_result_id?: string;
    data: GenerateDashboardResultData & ErrorResultData;
  }>;
};

const markdownPanelOperation = (content: string): DashboardOperation => ({
  operation: 'add_panels',
  panels: [
    {
      source: 'config',
      type: 'markdown',
      config: { content },
      grid: { x: 0, y: 0, w: 24, h: 4 },
    },
  ],
});

describe('generateDashboardTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreatePanelContentResolver.mockReturnValue(jest.fn());
  });

  it('exposes the dashboard generation tool id as a builtin tool', () => {
    const tool = generateDashboardTool();
    expect(tool.id).toBe(dashboardTools.generateDashboard);
    expect(tool.type).toBe(ToolType.builtin);
  });

  describe('new-dashboard metadata gate', () => {
    it('returns an error result and persists nothing when creating without a set_metadata title', async () => {
      const attachments = createMockAttachments();

      const results = await invokeTool(
        { operations: [markdownPanelOperation('### Summary')] },
        createHandlerContext(attachments)
      );

      expect(results).toEqual([
        {
          type: ToolResultType.error,
          data: {
            message: 'New dashboards require a set_metadata operation with a non-empty title.',
          },
        },
      ]);
      expect(attachments.add).not.toHaveBeenCalled();
      expect(attachments.update).not.toHaveBeenCalled();
    });

    it('returns an error result when the set_metadata title is blank', async () => {
      const attachments = createMockAttachments();

      const results = await invokeTool(
        { operations: [{ operation: 'set_metadata', title: '   ' }] },
        createHandlerContext(attachments)
      );

      expect(results[0].type).toBe(ToolResultType.error);
      expect(results[0].data.message).toBe(
        'New dashboards require a set_metadata operation with a non-empty title.'
      );
      expect(attachments.add).not.toHaveBeenCalled();
    });

    it('does not apply the gate when updating an existing dashboard', async () => {
      const attachments = createMockAttachments();
      attachments.getAttachmentRecord.mockReturnValue(
        createDashboardAttachmentRecord('dash-1', {
          title: 'Existing title',
          description: 'Existing description',
          panels: [],
        })
      );
      attachments.update.mockResolvedValue({ id: 'dash-1', current_version: 2 });

      const results = await invokeTool(
        { dashboardAttachmentId: 'dash-1', operations: [markdownPanelOperation('### Summary')] },
        createHandlerContext(attachments)
      );

      expect(results[0].type).toBe(ToolResultType.dashboard);
      expect(attachments.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('persistence', () => {
    it('adds a new attachment when no dashboardAttachmentId is provided', async () => {
      const attachments = createMockAttachments();
      attachments.add.mockResolvedValue({ id: 'new-dash', current_version: 1 });

      const results = await invokeTool(
        {
          operations: [
            {
              operation: 'set_metadata',
              title: 'My dashboard',
              time_range: { from: 'now-24h', to: 'now' },
            },
            markdownPanelOperation('### Summary'),
          ],
        },
        createHandlerContext(attachments)
      );

      expect(attachments.add).toHaveBeenCalledTimes(1);
      expect(attachments.add).toHaveBeenCalledWith({
        id: expect.any(String),
        type: DASHBOARD_ATTACHMENT_TYPE,
        description: 'Dashboard: My dashboard',
        data: expect.objectContaining({
          title: 'My dashboard',
          time_range: { from: 'now-24h', to: 'now' },
        }),
      });
      expect(attachments.update).not.toHaveBeenCalled();

      const { data } = results[0];
      expect(results[0].type).toBe(ToolResultType.dashboard);
      expect(data.attachment_id).toBe('new-dash');
      expect(data.version).toBe(1);
      // Write→read parity: the time_range set in this call is echoed back.
      expect(data.dashboard.time_range).toEqual({ from: 'now-24h', to: 'now' });
      expect(data.failures).toBeUndefined();
      expect(data.section_refs).toBeUndefined();
    });

    it('updates the existing attachment when dashboardAttachmentId is provided', async () => {
      const attachments = createMockAttachments();
      attachments.getAttachmentRecord.mockReturnValue(
        createDashboardAttachmentRecord('dash-1', {
          title: 'Existing title',
          description: 'Existing description',
          panels: [],
        })
      );
      attachments.update.mockResolvedValue({ id: 'dash-1', current_version: 2 });

      const results = await invokeTool(
        { dashboardAttachmentId: 'dash-1', operations: [markdownPanelOperation('### Summary')] },
        createHandlerContext(attachments)
      );

      expect(attachments.add).not.toHaveBeenCalled();
      expect(attachments.update).toHaveBeenCalledTimes(1);
      expect(attachments.update).toHaveBeenCalledWith('dash-1', {
        data: expect.objectContaining({
          title: 'Existing title',
          panels: [expect.objectContaining({ type: MARKDOWN_EMBEDDABLE_TYPE })],
        }),
        description: 'Dashboard: Existing title',
      });

      const { data } = results[0];
      expect(data.attachment_id).toBe('dash-1');
      expect(data.version).toBe(2);
    });
  });

  describe('error results', () => {
    it('returns a compact error result when the attachment cannot be found', async () => {
      const attachments = createMockAttachments();
      attachments.getAttachmentRecord.mockReturnValue(undefined);

      const results = await invokeTool(
        { dashboardAttachmentId: 'missing-dash', operations: [markdownPanelOperation('text')] },
        createHandlerContext(attachments)
      );

      expect(results).toEqual([
        {
          type: ToolResultType.error,
          data: {
            message: 'Failed to generate dashboard: Dashboard attachment "missing-dash" not found.',
            metadata: { dashboardAttachmentId: 'missing-dash' },
          },
        },
      ]);
    });

    it('returns a compact error result without echoing operations when persistence fails', async () => {
      const attachments = createMockAttachments();
      attachments.getAttachmentRecord.mockReturnValue(
        createDashboardAttachmentRecord('dash-1', {
          title: 'Existing title',
          description: undefined,
          panels: [],
        })
      );
      attachments.update.mockResolvedValue(undefined);

      const operationMarker = '### A distinctive markdown payload';
      const results = await invokeTool(
        { dashboardAttachmentId: 'dash-1', operations: [markdownPanelOperation(operationMarker)] },
        createHandlerContext(attachments)
      );

      expect(results[0].type).toBe(ToolResultType.error);
      expect(Object.keys(results[0].data).sort()).toEqual(['message', 'metadata']);
      expect(results[0].data.message).toBe(
        'Failed to generate dashboard: Failed to persist dashboard attachment "dash-1".'
      );
      expect(results[0].data.metadata).toEqual({ dashboardAttachmentId: 'dash-1' });
      // The failed operations must not be echoed back into the transcript.
      expect(JSON.stringify(results)).not.toContain(operationMarker);
    });
  });

  describe('summary', () => {
    it('echoes dashboard-level fields and per-panel identity hints', async () => {
      const longExpression = 'a'.repeat(150);
      const longContent = 'm'.repeat(80);
      const existingData: DashboardAttachmentData = {
        title: 'Web traffic',
        description: 'Traffic overview',
        time_range: { from: 'now-24h', to: 'now' },
        tags: ['traffic', 'prod'],
        query: { language: 'kuery', expression: longExpression },
        filters: [{ meta: { disabled: false } }, { meta: { disabled: true } }],
        pinned_panels: [{ type: 'optionsListControl' }],
        refresh_interval: { pause: false, value: 60000 },
        panels: [
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'lens-1',
            config: { type: 'xy', title: 'Requests over time', layers: [] },
            grid: { x: 0, y: 0, w: 24, h: 9 },
          },
          {
            type: MARKDOWN_EMBEDDABLE_TYPE,
            id: 'md-1',
            config: { content: longContent },
            grid: { x: 24, y: 0, w: 24, h: 9 },
          },
          {
            type: 'aiOpsLogRateAnalysis',
            id: 'other-1',
            config: { seriesType: 'log_rate' },
            grid: { x: 0, y: 9, w: 24, h: 9 },
          },
          {
            id: 'section-1',
            title: 'Details',
            collapsed: false,
            grid: { y: 20 },
            panels: [
              {
                type: LENS_EMBEDDABLE_TYPE,
                id: 'lens-2',
                config: { type: 'metric' },
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
            ],
          },
        ],
      };

      const attachments = createMockAttachments();
      attachments.getAttachmentRecord.mockReturnValue(
        createDashboardAttachmentRecord('dash-1', existingData)
      );
      attachments.update.mockResolvedValue({ id: 'dash-1', current_version: 2 });

      const results = await invokeTool(
        {
          dashboardAttachmentId: 'dash-1',
          operations: [{ operation: 'set_metadata', description: 'Traffic overview' }],
        },
        createHandlerContext(attachments)
      );

      expect(results[0].data.dashboard).toEqual({
        title: 'Web traffic',
        description: 'Traffic overview',
        time_range: { from: 'now-24h', to: 'now' },
        tags: ['traffic', 'prod'],
        query: { language: 'kuery', expression: `${'a'.repeat(120)}…` },
        filters_count: 2,
        controls_count: 1,
        refresh_interval: { pause: false, value: 60000 },
        panels: [
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'lens-1',
            grid: { x: 0, y: 0, w: 24, h: 9 },
            chart_type: 'xy',
            title: 'Requests over time',
          },
          {
            type: MARKDOWN_EMBEDDABLE_TYPE,
            id: 'md-1',
            grid: { x: 24, y: 0, w: 24, h: 9 },
            content_preview: `${'m'.repeat(60)}…`,
          },
          {
            type: 'aiOpsLogRateAnalysis',
            id: 'other-1',
            grid: { x: 0, y: 9, w: 24, h: 9 },
          },
          {
            id: 'section-1',
            title: 'Details',
            collapsed: false,
            grid: { y: 20 },
            panels: [
              {
                type: LENS_EMBEDDABLE_TYPE,
                id: 'lens-2',
                grid: { x: 0, y: 0, w: 24, h: 9 },
                chart_type: 'metric',
              },
            ],
          },
        ],
      });
    });

    it('omits absent dashboard-level fields and identity hints entirely', async () => {
      const attachments = createMockAttachments();
      attachments.add.mockResolvedValue({ id: 'new-dash', current_version: 1 });

      const results = await invokeTool(
        {
          operations: [
            { operation: 'set_metadata', title: 'Minimal dashboard' },
            markdownPanelOperation('Short note'),
          ],
        },
        createHandlerContext(attachments)
      );

      const { dashboard } = results[0].data;
      expect(Object.keys(dashboard)).toEqual(['title', 'description', 'panels']);
      // Short markdown content is previewed without truncation.
      expect(dashboard.panels).toEqual([
        expect.objectContaining({
          type: MARKDOWN_EMBEDDABLE_TYPE,
          content_preview: 'Short note',
        }),
      ]);
    });
  });

  describe('failures passthrough', () => {
    it('returns recorded soft failures while persisting what succeeded', async () => {
      mockedCreatePanelContentResolver.mockReturnValue(async ({ identifier }) => ({
        type: 'failure',
        failure: {
          type: 'add_panels',
          identifier,
          error: 'ES|QL generation failed',
        },
      }));

      const attachments = createMockAttachments();
      attachments.add.mockResolvedValue({ id: 'new-dash', current_version: 1 });

      const results = await invokeTool(
        {
          operations: [
            { operation: 'set_metadata', title: 'My dashboard' },
            {
              operation: 'add_panels',
              panels: [
                {
                  source: 'request',
                  type: 'vis',
                  query: 'show p95 latency',
                  grid: { x: 0, y: 0, w: 24, h: 9 },
                },
              ],
            },
          ],
        },
        createHandlerContext(attachments)
      );

      // The dashboard is still persisted without the failed panel.
      expect(attachments.add).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ panels: [] }) })
      );
      expect(results[0].type).toBe(ToolResultType.dashboard);
      expect(results[0].data.failures).toEqual([
        {
          type: 'add_panels',
          identifier: 'show p95 latency',
          error: 'ES|QL generation failed',
          operationIndex: 1,
        },
      ]);
    });
  });

  describe('section refs', () => {
    it('maps declared add_section refs to minted section ids', async () => {
      const attachments = createMockAttachments();
      attachments.add.mockResolvedValue({ id: 'new-dash', current_version: 1 });

      const results = await invokeTool(
        {
          operations: [
            { operation: 'set_metadata', title: 'My dashboard' },
            { operation: 'add_section', title: 'Overview', ref: 'overview', grid: { y: 0 } },
            {
              operation: 'add_panels',
              panels: [
                {
                  source: 'config',
                  type: 'markdown',
                  config: { content: 'In the new section' },
                  sectionId: 'overview',
                  grid: { x: 0, y: 0, w: 24, h: 4 },
                },
              ],
            },
          ],
        },
        createHandlerContext(attachments)
      );

      const { data } = results[0];
      expect(data.section_refs).toEqual({ overview: expect.any(String) });
      expect(data.failures).toBeUndefined();

      // The mapped id is the minted id of the persisted section.
      const persistedData = attachments.add.mock.calls[0][0].data as DashboardAttachmentData;
      const [section] = persistedData.panels;
      expect(data.section_refs).toEqual({ overview: section.id });
      expect(data.dashboard.panels).toEqual([
        expect.objectContaining({
          id: section.id,
          title: 'Overview',
          panels: [expect.objectContaining({ content_preview: 'In the new section' })],
        }),
      ]);
    });
  });
});
