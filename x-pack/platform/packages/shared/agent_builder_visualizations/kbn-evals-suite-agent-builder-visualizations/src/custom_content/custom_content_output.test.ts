/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import {
  getLastCustomContentAttachmentId,
  getLastWrittenDashboardId,
  findStoredPanel,
  getCustomContentToolArgs,
  getToolErrors,
  readStoredCustomContent,
  readStoredCustomContentFromDashboard,
  toStoredCustomContent,
  toLoggedVisualizations,
} from './custom_content_output';

const customContentData = (overrides: Record<string, unknown> = {}) => ({
  renderer: 'custom_content',
  query: 'a status board',
  esql: 'FROM logs | STATS count = COUNT(*) BY host',
  visualization: { template: '<div>{{ rows.size }}</div>', height: 320 },
  ...overrides,
});

const conversationWith = (
  versions: Array<Record<string, unknown>>,
  overrides: Record<string, unknown> = {}
): Conversation =>
  ({
    attachments: [
      {
        id: 'att-1',
        type: 'visualization',
        current_version: versions.length,
        versions: versions.map((data, index) => ({ version: index + 1, data })),
        ...overrides,
      },
    ],
  } as unknown as Conversation);

describe('toStoredCustomContent', () => {
  it('reads the query, template and height of a custom content panel', () => {
    expect(toStoredCustomContent(customContentData())).toEqual({
      esql: 'FROM logs | STATS count = COUNT(*) BY host',
      template: '<div>{{ rows.size }}</div>',
      height: 320,
    });
  });

  it('leaves the query out of a static panel', () => {
    expect(toStoredCustomContent(customContentData({ esql: undefined }))).not.toHaveProperty(
      'esql'
    );
    expect(toStoredCustomContent(customContentData({ esql: '  ' }))).not.toHaveProperty('esql');
  });

  it('ignores panels of other renderers', () => {
    expect(toStoredCustomContent({ renderer: 'lens', esql: 'FROM logs' })).toBeUndefined();
    expect(toStoredCustomContent(undefined)).toBeUndefined();
  });
});

describe('readStoredCustomContent', () => {
  it('returns the first and latest stored versions with the version count', () => {
    const conversation = conversationWith([
      customContentData({ visualization: { template: '<p>old</p>' } }),
      customContentData({ visualization: { template: '<p>new</p>' } }),
    ]);

    const { before, after, versionCount } = readStoredCustomContent(conversation, 'att-1');

    expect(before?.template).toBe('<p>old</p>');
    expect(after?.template).toBe('<p>new</p>');
    expect(versionCount).toBe(2);
  });

  it('reports no versions for an unknown attachment or another attachment type', () => {
    expect(readStoredCustomContent(conversationWith([customContentData()]), 'other')).toEqual({
      versionCount: 0,
    });
    expect(
      readStoredCustomContent(
        conversationWith([customContentData()], { type: 'dashboard' }),
        'att-1'
      )
    ).toEqual({ versionCount: 0 });
  });
});

describe('getLastCustomContentAttachmentId', () => {
  const step = (renderer: string, attachmentId: string, esql = 'FROM logs') => ({
    type: 'tool_call',
    tool_id: 'platform.core.create_visualization',
    results: [{ type: 'visualization', data: { renderer, esql, attachment_id: attachmentId } }],
  });

  it('returns the attachment of the last custom content result', () => {
    expect(
      getLastCustomContentAttachmentId([
        step('custom_content', 'first'),
        step('lens', 'chart'),
        step('custom_content', 'second'),
      ])
    ).toBe('second');
  });

  it('returns undefined when no custom content was created', () => {
    expect(getLastCustomContentAttachmentId([step('lens', 'chart')])).toBeUndefined();
    expect(getLastCustomContentAttachmentId(undefined)).toBeUndefined();
  });
});

const customContentPanel = (id: string, esql?: string, template = '<p>hi</p>') => ({
  id,
  type: 'custom_content',
  grid: { x: 0, y: 0, w: 12, h: 5 },
  config: { esql_query: esql ? [esql] : undefined, template },
});

const dashboardConversation = (versions: Array<Record<string, unknown>>): Conversation =>
  ({
    attachments: [
      {
        id: 'dash-1',
        type: DASHBOARD_ATTACHMENT_TYPE,
        current_version: versions.length,
        versions: versions.map((data, index) => ({ version: index + 1, data })),
      },
    ],
  } as unknown as Conversation);

describe('getLastWrittenDashboardId', () => {
  const step = (toolId: string, attachmentId?: string) => ({
    type: 'tool_call',
    tool_id: toolId,
    results: [{ type: 'other', data: attachmentId ? { attachment_id: attachmentId } : {} }],
  });

  it('returns the attachment of the last generate_dashboard result', () => {
    expect(
      getLastWrittenDashboardId([
        step('platform.dashboard.generate_dashboard', 'first'),
        step('platform.core.generate_esql'),
        step('platform.dashboard.generate_dashboard', 'second'),
      ])
    ).toBe('second');
  });

  it('returns undefined when no dashboard was written', () => {
    expect(getLastWrittenDashboardId([step('platform.core.create_visualization', 'x')])).toBe(
      undefined
    );
    expect(getLastWrittenDashboardId(undefined)).toBeUndefined();
  });
});

describe('readStoredCustomContentFromDashboard', () => {
  it('reads the custom content panel of a dashboard, including one inside a section', () => {
    const conversation = dashboardConversation([
      {
        title: 'd',
        panels: [
          {
            id: 'sec',
            title: 's',
            collapsed: false,
            grid: { y: 0 },
            panels: [customContentPanel('p1', 'FROM logs | STATS c = COUNT(*)')],
          },
        ],
      },
    ]);

    const { before, after, versionCount } = readStoredCustomContentFromDashboard(
      conversation,
      'dash-1'
    );

    expect(after).toEqual({ esql: 'FROM logs | STATS c = COUNT(*)', template: '<p>hi</p>' });
    expect(before).toEqual(after);
    expect(versionCount).toBe(1);
  });

  it('returns the id of the panel it read', () => {
    const conversation = dashboardConversation([
      { panels: [customContentPanel('p1', 'FROM logs'), customContentPanel('p2', 'FROM other')] },
    ]);

    expect(readStoredCustomContentFromDashboard(conversation, 'dash-1').panelId).toBe('p2');
  });

  it('compares the first and latest version of the same panel after an edit', () => {
    const conversation = dashboardConversation([
      {
        title: 'd',
        panels: [customContentPanel('p1', 'FROM logs | STATS c = COUNT(*)', '<p>old</p>')],
      },
      {
        title: 'd',
        panels: [
          customContentPanel('p1', 'FROM logs | STATS c = COUNT(*) BY machine.os', '<p>new</p>'),
        ],
      },
    ]);

    const { before, after, versionCount } = readStoredCustomContentFromDashboard(
      conversation,
      'dash-1'
    );

    expect(before).toEqual({ esql: 'FROM logs | STATS c = COUNT(*)', template: '<p>old</p>' });
    expect(after?.esql).toBe('FROM logs | STATS c = COUNT(*) BY machine.os');
    expect(versionCount).toBe(2);
  });

  it('leaves the query out of a static panel and ignores other panel types', () => {
    const conversation = dashboardConversation([
      {
        title: 'd',
        panels: [
          { id: 'md', type: 'markdown', grid: { x: 0, y: 0, w: 1, h: 1 }, config: {} },
          customContentPanel('banner'),
        ],
      },
    ]);

    const { after } = readStoredCustomContentFromDashboard(conversation, 'dash-1');

    expect(after).toEqual({ template: '<p>hi</p>' });
    expect(after).not.toHaveProperty('esql');
  });

  it('reports no versions for an unknown attachment or a dashboard without custom content', () => {
    expect(readStoredCustomContentFromDashboard(dashboardConversation([]), 'other')).toEqual({
      versionCount: 0,
    });
    const { after, versionCount } = readStoredCustomContentFromDashboard(
      dashboardConversation([{ title: 'd', panels: [] }]),
      'dash-1'
    );
    expect(after).toBeUndefined();
    expect(versionCount).toBe(1);
  });
});

describe('getToolErrors', () => {
  it('lists the error messages of failed tool calls with the tool id', () => {
    expect(
      getToolErrors([
        {
          type: 'tool_call',
          tool_id: 'platform.core.create_visualization',
          results: [{ type: 'error', data: { message: 'Could not generate an ES|QL query' } }],
        },
        { type: 'tool_call', tool_id: 'platform.core.generate_esql', results: [{ type: 'query' }] },
      ])
    ).toEqual(['platform.core.create_visualization: Could not generate an ES|QL query']);
  });

  it('returns nothing when no tool failed', () => {
    expect(getToolErrors(undefined)).toEqual([]);
    expect(getToolErrors([{ type: 'reasoning' }])).toEqual([]);
  });
});

describe('toLoggedVisualizations', () => {
  it('shows the stored panel with its query and a template excerpt', () => {
    const [visualization] = toLoggedVisualizations(
      { esql: 'FROM logs', template: 'x'.repeat(300), height: 320 },
      'attachment-1'
    );

    expect(visualization).toMatchObject({
      esql: 'FROM logs',
      renderer: 'custom_content',
      attachmentId: 'attachment-1',
    });
    expect(visualization.visualization?.height).toBe(320);
    expect(String(visualization.visualization?.template)).toHaveLength(201);
  });

  it('shows a static panel with an empty query, and nothing when no panel was stored', () => {
    expect(toLoggedVisualizations({ template: '<p/>' }, undefined)[0].esql).toBe('');
    expect(toLoggedVisualizations(undefined, undefined)).toEqual([]);
  });
});

describe('findStoredPanel', () => {
  const vizStep = (attachmentId: string) => ({
    type: 'tool_call',
    tool_id: 'platform.core.create_visualization',
    results: [
      {
        type: 'visualization',
        data: { renderer: 'custom_content', esql: 'FROM logs', attachment_id: attachmentId },
      },
    ],
  });

  it('reads a panel stored in a visualization attachment, with its version count', () => {
    const conversation = conversationWith([
      customContentData({ esql: 'FROM logs', visualization: { template: '<p>old</p>' } }),
      customContentData({ esql: 'FROM logs', visualization: { template: '<p>new</p>' } }),
    ]);

    expect(findStoredPanel([vizStep('att-1')], conversation)).toMatchObject({
      attachmentId: 'att-1',
      storedIn: 'visualization',
      versionCount: 2,
      content: { esql: 'FROM logs', template: '<p>new</p>' },
    });
  });

  it('reports nothing when no panel was stored', () => {
    expect(findStoredPanel([], { attachments: [] } as unknown as Conversation)).toEqual({
      versionCount: 0,
      storedIn: 'none',
    });
  });
});

describe('getCustomContentToolArgs', () => {
  const call = (tool_id: string, params: Record<string, unknown>) => ({
    type: 'tool_call',
    tool_id,
    params,
  });

  it('shows whether generate_dashboard was told the panel has data', () => {
    const [omitted, passed] = getCustomContentToolArgs([
      call('platform.dashboard.generate_dashboard', {
        panels: [
          {
            id: 'banner',
            content: {
              source: 'request',
              renderer: 'custom_content',
              query: 'show the live total number of requests',
            },
          },
          {
            id: 'kpi',
            content: {
              source: 'request',
              renderer: 'custom_content',
              query: 'show requests',
              hasData: true,
              esql: 'FROM logs | STATS c = COUNT(*)',
            },
          },
        ],
      }),
    ]);

    expect(omitted).toContain('panel banner: hasData=unset');
    expect(omitted).toContain('esql=no');
    expect(passed).toContain('panel kpi: hasData=true');
    expect(passed).toContain('esql=yes');
    expect(passed).not.toContain('FROM logs');
  });

  it('reads create_visualization targets and the update tool', () => {
    const lines = getCustomContentToolArgs([
      call('platform.core.create_visualization', {
        query: 'a status board',
        target: { type: 'custom_content', has_data: false },
      }),
      call('custom_content_update_panel', {
        embeddable_id: 'p1',
        prompt: 'x'.repeat(200),
        regenerateEsql: true,
      }),
    ]);

    expect(lines[0]).toContain('create_visualization custom_content: has_data=false');
    expect(lines[1]).toContain('regenerateEsql=true');
    expect(lines[1].length).toBeLessThan(200);
  });

  it('ignores other tools, other renderers and steps without params', () => {
    expect(
      getCustomContentToolArgs([
        call('platform.core.get_index_mapping', { index: 'logs' }),
        call('platform.dashboard.generate_dashboard', {
          panels: [{ id: 'a', content: { source: 'request', renderer: 'lens', query: 'x' } }],
        }),
        { type: 'tool_call', tool_id: 'platform.dashboard.generate_dashboard' },
        { type: 'reasoning' },
      ])
    ).toEqual([]);
    expect(getCustomContentToolArgs(undefined)).toEqual([]);
  });
});
