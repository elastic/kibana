/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools/builtin';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  getDashboardPanelAttachmentId,
} from '@kbn/agent-builder-dashboards-common';
import { VISUALIZATION_ATTACHMENT_TYPE } from '@kbn/agent-builder-visualizations-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { dashboardTools } from '../../../common';
import { createPointedPanelTool } from './pointed_panel_tool';

const POINTER_ID = getDashboardPanelAttachmentId('panel-1');
const grid = { x: 0, y: 0, w: 24, h: 15 };

const pointer = (panelId = 'panel-1', dashboardAttachmentId = 'dashboard-1') => ({
  id: POINTER_ID,
  type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [
    {
      version: 1,
      data: {
        dashboard_attachment_id: dashboardAttachmentId,
        panel_id: panelId,
        label: 'Pointer label',
        panel_type: LENS_EMBEDDABLE_TYPE,
      },
    },
  ],
});

const dashboard = (panels: unknown[]) => ({
  id: 'dashboard-1',
  type: DASHBOARD_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [{ version: 1, data: { title: 'Web Traffic', panels } }],
});

const customPanel = (config: Record<string, unknown>) => ({
  type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
  id: 'panel-1',
  grid,
  config,
});

const lensPanel = (config: Record<string, unknown>) => ({
  type: LENS_EMBEDDABLE_TYPE,
  id: 'panel-1',
  grid,
  config,
});

const createAttachments = (records: Record<string, unknown>) => {
  const add = jest.fn(async (input: { type: string; data: unknown }) => ({
    id: 'viz-1',
    type: input.type,
    current_version: 1,
    versions: [{ version: 1, data: input.data }],
  }));
  const attachments = {
    getAttachmentRecord: jest.fn((id: string) => records[id]),
    add,
  } as unknown as AttachmentStateManager;
  return { attachments, add };
};

const logger = { debug: jest.fn(), error: jest.fn() } as unknown as Logger;

const firstResult = (returned: Awaited<ReturnType<BuiltinToolDefinition['handler']>>) => {
  if (!('results' in returned)) {
    throw new Error('Expected a results return');
  }
  return returned.results[0];
};

const run = async (records: Record<string, unknown>, action: 'read' | 'show' = 'show') => {
  const { attachments, add } = createAttachments(records);
  const tool = createPointedPanelTool() as BuiltinToolDefinition;
  const result = await tool.handler({ panel_attachment_id: POINTER_ID, action }, {
    attachments,
    logger,
  } as unknown as Parameters<BuiltinToolDefinition['handler']>[1]);
  return { result: firstResult(result), add };
};

describe('createPointedPanelTool', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers under the dashboard tool id', () => {
    expect(createPointedPanelTool().id).toBe(dashboardTools.pointedPanel);
  });

  it('reads only the pointed panel with its ES|QL query', async () => {
    const config = {
      type: 'metric',
      title: 'Requests',
      data_source: { type: 'esql', query: 'FROM logs | STATS c = COUNT(*)' },
    };
    const { result, add } = await run(
      {
        [POINTER_ID]: pointer(),
        'dashboard-1': dashboard([
          lensPanel(config),
          { ...customPanel({ template: '<p/>' }), id: 'panel-2' },
        ]),
      },
      'read'
    );

    expect(result).toEqual({
      tool_result_id: expect.any(String),
      type: ToolResultType.other,
      data: {
        panel_attachment_id: POINTER_ID,
        dashboard_attachment_id: 'dashboard-1',
        panel: { id: 'panel-1', type: LENS_EMBEDDABLE_TYPE, title: 'Requests', config },
        esql: 'FROM logs | STATS c = COUNT(*)',
      },
    });
    expect(add).not.toHaveBeenCalled();
  });

  it('reads panels that cannot be shown', async () => {
    const { result } = await run(
      {
        [POINTER_ID]: pointer(),
        'dashboard-1': dashboard([{ type: 'markdown', id: 'panel-1', grid, config: {} }]),
      },
      'read'
    );

    expect(result).toMatchObject({
      type: ToolResultType.other,
      data: { panel: { id: 'panel-1', type: 'markdown', config: {} } },
    });
  });

  it('copies a custom panel into a custom content visualization attachment', async () => {
    const { result, add } = await run({
      [POINTER_ID]: pointer(),
      'dashboard-1': dashboard([
        customPanel({ title: 'Stick figure', template: '<svg />', esql_query: ['FROM logs'] }),
      ]),
    });

    expect(add).toHaveBeenCalledWith({
      type: VISUALIZATION_ATTACHMENT_TYPE,
      description: expect.stringContaining('Visualization:'),
      data: {
        renderer: 'custom_content',
        query: 'Panel "Stick figure" from dashboard "Web Traffic"',
        visualization: { template: '<svg />', title: 'Stick figure' },
        esql: 'FROM logs',
      },
    });
    expect(result).toMatchObject({
      type: ToolResultType.visualization,
      data: {
        attachment_id: 'viz-1',
        version: 1,
        renderer: 'custom_content',
        visualization: { prompt: 'Panel "Stick figure" from dashboard "Web Traffic"' },
      },
    });
  });

  it('copies an ES|QL Lens panel with its config, query and chart type', async () => {
    const config = {
      type: 'metric',
      title: 'Requests',
      data_source: { type: 'esql', query: 'FROM logs | STATS c = COUNT(*)' },
    };
    const { result, add } = await run({
      [POINTER_ID]: pointer(),
      'dashboard-1': dashboard([lensPanel(config)]),
    });

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        type: VISUALIZATION_ATTACHMENT_TYPE,
        data: {
          renderer: 'lens',
          query: 'Panel "Requests" from dashboard "Web Traffic"',
          visualization: config,
          chart_type: 'metric',
          esql: 'FROM logs | STATS c = COUNT(*)',
        },
      })
    );
    expect(result).toMatchObject({
      type: ToolResultType.visualization,
      data: { attachment_id: 'viz-1', renderer: 'lens', chart_type: 'metric' },
    });
  });

  it('names an untitled Lens copy after its primary metric', async () => {
    const { add } = await run({
      [POINTER_ID]: pointer(),
      'dashboard-1': dashboard([
        lensPanel({
          type: 'metric',
          metrics: [{ type: 'primary', column: 'Errors' }],
          data_source: { type: 'esql', query: 'FROM logs | STATS c = COUNT(*)' },
        }),
      ]),
    });

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ query: 'Panel "Errors" from dashboard "Web Traffic"' }),
      })
    );
  });

  it('falls back to the pointer label when the panel has no title', async () => {
    const { add } = await run({
      [POINTER_ID]: pointer(),
      'dashboard-1': dashboard([customPanel({ template: '<p>hi</p>' })]),
    });

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          query: 'Panel "Pointer label" from dashboard "Web Traffic"',
          visualization: { template: '<p>hi</p>' },
        }),
      })
    );
  });

  const errorMessage = (result: { type: string; data: unknown }) => {
    expect(result.type).toBe(ToolResultType.error);
    return (result.data as { message: string }).message;
  };

  it.each([
    ['the id is not a pointer', { 'dashboard-1': dashboard([]) }, 'not a platform.dashboard.panel'],
    [
      'the pointed dashboard is missing',
      { [POINTER_ID]: pointer('panel-1', 'missing') },
      '"missing" named by the pointer is not in this conversation',
    ],
    [
      'the panel was removed',
      { [POINTER_ID]: pointer(), 'dashboard-1': dashboard([]) },
      'no longer exists',
    ],
    [
      'the custom panel has no template',
      { [POINTER_ID]: pointer(), 'dashboard-1': dashboard([customPanel({})]) },
      'no template yet',
    ],
    [
      'the Lens panel is not backed by ES|QL',
      { [POINTER_ID]: pointer(), 'dashboard-1': dashboard([lensPanel({ type: 'metric' })]) },
      'not backed by ES|QL',
    ],
    [
      'the panel type is unsupported',
      {
        [POINTER_ID]: pointer(),
        'dashboard-1': dashboard([{ type: 'markdown', id: 'panel-1', grid, config: {} }]),
      },
      'cannot be shown as a visualization',
    ],
  ])('returns an error result when %s', async (_case, records, expected) => {
    const { result, add } = await run(records);

    expect(errorMessage(result)).toContain(expected);
    expect(add).not.toHaveBeenCalled();
  });

  it('returns an error result when persisting the attachment fails', async () => {
    const { attachments } = createAttachments({
      [POINTER_ID]: pointer(),
      'dashboard-1': dashboard([customPanel({ template: '<p>hi</p>' })]),
    });
    (attachments.add as jest.Mock).mockRejectedValue(new Error('boom'));
    const tool = createPointedPanelTool() as BuiltinToolDefinition;

    const result = await tool.handler({ panel_attachment_id: POINTER_ID, action: 'show' }, {
      attachments,
      logger,
    } as unknown as Parameters<BuiltinToolDefinition['handler']>[1]);

    expect(errorMessage(firstResult(result))).toContain('boom');
    expect(logger.error).toHaveBeenCalled();
  });
});
