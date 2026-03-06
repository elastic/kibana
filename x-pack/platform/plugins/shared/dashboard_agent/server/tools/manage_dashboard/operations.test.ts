/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentPanel, DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import { executeDashboardOperations, type DashboardOperation } from './operations';

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('executeDashboardOperations', () => {
  const logger = createMockLogger();

  it('executes operations in order', async () => {
    const events: string[] = [];

    const baseDashboardData: DashboardAttachmentData = {
      title: 'Original title',
      description: 'Original description',
      panels: [
        {
          type: 'lens',
          panelId: 'existing-panel',
          visualization: { type: 'metric' },
        },
      ],
    };

    const attachmentPanel: AttachmentPanel = {
      type: 'lens',
      panelId: 'from-attachment-panel',
      visualization: { type: 'xy' },
      title: 'From attachment',
    };

    const operations: DashboardOperation[] = [
      { operation: 'set_metadata', title: 'Updated title' },
      { operation: 'remove_panels', panelIds: ['existing-panel'] },
      {
        operation: 'add_panels_from_attachments',
        items: [{ attachmentId: 'viz-1', grid: { x: 0, y: 0, w: 24, h: 9 } }],
      },
      {
        operation: 'upsert_markdown',
        markdownContent: '### Updated summary',
      },
    ];

    const result = await executeDashboardOperations({
      dashboardData: baseDashboardData,
      operations,
      logger,
      resolvePanelsFromAttachments: async () => ({ panels: [attachmentPanel], failures: [] }),
      onPanelsAdded: (panels) => {
        for (const panel of panels) {
          events.push(`added:${panel.panelId}`);
        }
      },
      onPanelsRemoved: (panels) => {
        events.push(`removed:${panels.map(({ panelId }) => panelId).join(',')}`);
      },
    });

    expect(result.dashboardData.title).toBe('Updated title');
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({
        type: MARKDOWN_EMBEDDABLE_TYPE,
        grid: expect.objectContaining({ w: 48 }),
      }),
      expect.objectContaining({
        panelId: 'from-attachment-panel',
        grid: { x: 0, y: 0, w: 24, h: 9 },
      }),
    ]);

    expect(events).toHaveLength(3);
    expect(events.filter((event) => event.startsWith('removed:'))).toEqual([
      'removed:existing-panel',
    ]);
    expect(events.filter((event) => event.startsWith('added:'))).toHaveLength(2);
  });

  it('aggregates failures for attachment-based adds', async () => {
    const attachmentPanel: AttachmentPanel = {
      type: 'lens',
      panelId: 'from-attachment',
      visualization: { type: 'metric' },
    };

    const result = await executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [],
      },
      operations: [
        {
          operation: 'add_panels_from_attachments',
          items: [
            { attachmentId: 'viz-1', grid: { x: 0, y: 0, w: 24, h: 9 } },
            { attachmentId: 'missing-viz-1', grid: { x: 24, y: 0, w: 24, h: 9 } },
          ],
        },
        {
          operation: 'add_panels_from_attachments',
          items: [{ attachmentId: 'missing-viz-2', grid: { x: 0, y: 9, w: 12, h: 5 } }],
        },
      ],
      logger,
      resolvePanelsFromAttachments: async (attachmentIds) => {
        const panels = attachmentIds.includes('viz-1') ? [attachmentPanel] : [];
        const failures = attachmentIds
          .filter((attachmentId) => attachmentId.startsWith('missing-viz'))
          .map((missingAttachmentId) => ({
            type: 'attachment_panels',
            identifier: missingAttachmentId,
            error: 'Attachment not found',
          }));
        return { panels, failures };
      },
      onPanelsAdded: () => {},
      onPanelsRemoved: () => {},
    });

    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({ panelId: 'from-attachment' }),
    ]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        type: 'attachment_panels',
        identifier: 'missing-viz-1',
      }),
      expect.objectContaining({
        type: 'attachment_panels',
        identifier: 'missing-viz-2',
      }),
    ]);
  });

  it('preserves dashboard metadata while mutating panels', async () => {
    const result = await executeDashboardOperations({
      dashboardData: {
        title: 'Existing title',
        description: 'Existing description',
        savedObjectId: 'saved-dashboard-id',
        sections: [
          {
            title: 'Section 1',
            panels: [],
          },
        ],
        panels: [],
      },
      operations: [
        {
          operation: 'add_panels_from_attachments',
          items: [{ attachmentId: 'viz-1', grid: { x: 0, y: 0, w: 12, h: 5 } }],
        },
      ],
      logger,
      resolvePanelsFromAttachments: async () => ({
        panels: [
          {
            type: 'lens',
            panelId: 'from-attachment-1',
            visualization: { type: 'metric' },
          },
        ],
        failures: [],
      }),
      onPanelsAdded: () => {},
      onPanelsRemoved: () => {},
    });

    expect(result.dashboardData.savedObjectId).toBe('saved-dashboard-id');
    expect(result.dashboardData.sections).toEqual([
      {
        title: 'Section 1',
        panels: [],
      },
    ]);
    expect(result.dashboardData.panels).toHaveLength(1);
  });
});
