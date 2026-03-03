/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
  LensAttachmentPanel,
} from '@kbn/dashboard-agent-common';
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

    const generatedPanel: LensAttachmentPanel = {
      type: 'lens',
      panelId: 'generated-panel',
      visualization: { type: 'xy' },
      title: 'Generated panel',
    };

    const operations: DashboardOperation[] = [
      { operation: 'set_metadata', title: 'Updated title' },
      { operation: 'remove_panels', panelIds: ['existing-panel'] },
      {
        operation: 'add_generated_panels',
        items: [{ query: 'Show request count over time' }],
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
      generatePanels: async (_items, onPanelCreated) => {
        onPanelCreated?.(generatedPanel);
        return {
          panels: [generatedPanel],
          failures: [],
        };
      },
      resolvePanelsFromAttachments: async () => ({ panels: [], failures: [] }),
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
      }),
      expect.objectContaining({ panelId: 'generated-panel' }),
    ]);

    expect(events).toHaveLength(3);
    expect(events.filter((event) => event.startsWith('removed:'))).toEqual([
      'removed:existing-panel',
    ]);
    expect(events.filter((event) => event.startsWith('added:'))).toHaveLength(2);
  });

  it('aggregates failures for generated and attachment-based adds', async () => {
    const generatedPanel: LensAttachmentPanel = {
      type: 'lens',
      panelId: 'generated-1',
      visualization: { type: 'xy' },
    };
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
          operation: 'add_generated_panels',
          items: [{ query: 'Show traffic over time' }, { query: 'Show error rate over time' }],
        },
        {
          operation: 'add_panels_from_attachments',
          attachmentIds: ['viz-1', 'missing-viz'],
        },
      ],
      logger,
      generatePanels: async (_items, onPanelCreated) => {
        onPanelCreated?.(generatedPanel);
        return {
          panels: [generatedPanel],
          failures: [
            {
              type: 'generated_visualization',
              identifier: 'Show error rate over time',
              error: 'Field not found',
            },
          ],
        };
      },
      resolvePanelsFromAttachments: async () => ({
        panels: [attachmentPanel],
        failures: [
          {
            type: 'attachment_panels',
            identifier: 'missing-viz',
            error: 'Attachment not found',
          },
        ],
      }),
      onPanelsAdded: () => {},
      onPanelsRemoved: () => {},
    });

    expect(result.dashboardData.panels).toHaveLength(2);
    expect(result.failures).toEqual([
      expect.objectContaining({
        type: 'generated_visualization',
        identifier: 'Show error rate over time',
      }),
      expect.objectContaining({
        type: 'attachment_panels',
        identifier: 'missing-viz',
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
          operation: 'add_generated_panels',
          items: [{ query: 'Show count as metric' }],
        },
      ],
      logger,
      generatePanels: async () => ({
        panels: [
          {
            type: 'lens',
            panelId: 'generated-panel-1',
            visualization: { type: 'metric' },
          },
        ],
        failures: [],
      }),
      resolvePanelsFromAttachments: async () => ({ panels: [], failures: [] }),
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
