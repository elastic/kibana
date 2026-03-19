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
  const createLensPanel = (panelId: string, gridY = 0): AttachmentPanel => ({
    type: 'lens',
    panelId,
    visualization: { type: 'metric' },
    grid: { x: 0, y: gridY, w: 24, h: 9 },
  });

  it('executes operations in order', async () => {
    const events: string[] = [];

    const baseDashboardData: DashboardAttachmentData = {
      title: 'Original title',
      description: 'Original description',
      panels: [
        {
          ...createLensPanel('existing-panel'),
        },
      ],
    };

    const attachmentPanel: AttachmentPanel = {
      ...createLensPanel('from-attachment-panel'),
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
        operation: 'add_markdown',
        markdownContent: '### Updated summary',
        grid: { x: 0, y: 9, w: 48, h: 5 },
      },
    ];

    const result = executeDashboardOperations({
      dashboardData: baseDashboardData,
      operations,
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [attachmentPanel], failures: [] }),
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
        panelId: 'from-attachment-panel',
        grid: { x: 0, y: 0, w: 24, h: 9 },
      }),
      expect.objectContaining({
        type: MARKDOWN_EMBEDDABLE_TYPE,
        grid: { x: 0, y: 9, w: 48, h: 5 },
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
      ...createLensPanel('from-attachment'),
    };

    const result = executeDashboardOperations({
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
      resolvePanelsFromAttachments: (attachmentInputs) => {
        const attachmentIds = attachmentInputs.map(({ attachmentId }) => attachmentId);
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
    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Existing title',
        description: 'Existing description',
        savedObjectId: 'saved-dashboard-id',
        sections: [
          {
            sectionId: 'section-1',
            title: 'Section 1',
            collapsed: false,
            grid: { y: 10 },
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
      resolvePanelsFromAttachments: () => ({
        panels: [
          {
            ...createLensPanel('from-attachment-1'),
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
        sectionId: 'section-1',
        title: 'Section 1',
        collapsed: false,
        grid: { y: 10 },
        panels: [],
      },
    ]);
    expect(result.dashboardData.panels).toHaveLength(1);
  });

  it('adds a section with generated sectionId and default collapsed=false', async () => {
    const addedPanelEvents: string[] = [];

    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [],
      },
      operations: [
        {
          operation: 'add_section',
          title: 'Overview',
          grid: { y: 12 },
          panels: [{ attachmentId: 'viz-1', grid: { x: 0, y: 0, w: 24, h: 9 } }],
        },
      ],
      logger,
      resolvePanelsFromAttachments: () => ({
        panels: [createLensPanel('section-panel-1')],
        failures: [],
      }),
      onPanelsAdded: (panels) => {
        addedPanelEvents.push(...panels.map(({ panelId }) => panelId));
      },
      onPanelsRemoved: () => {},
    });

    expect(result.dashboardData.sections).toHaveLength(1);
    expect(result.dashboardData.sections?.[0]).toEqual({
      sectionId: expect.any(String),
      title: 'Overview',
      collapsed: false,
      grid: { y: 12 },
      panels: [
        expect.objectContaining({
          panelId: 'section-panel-1',
          grid: { x: 0, y: 0, w: 24, h: 9 },
        }),
      ],
    });
    expect(addedPanelEvents).toEqual(['section-panel-1']);
  });

  it('adds attachment panels into a target section when sectionId is provided', async () => {
    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [],
        sections: [
          {
            sectionId: 'section-a',
            title: 'Section A',
            collapsed: false,
            grid: { y: 8 },
            panels: [],
          },
        ],
      },
      operations: [
        {
          operation: 'add_panels_from_attachments',
          items: [
            {
              attachmentId: 'viz-1',
              sectionId: 'section-a',
              grid: { x: 12, y: 0, w: 12, h: 5 },
            },
          ],
        },
      ],
      logger,
      resolvePanelsFromAttachments: (attachmentInputs) => ({
        panels: [
          {
            ...createLensPanel('section-routed-panel'),
            grid: attachmentInputs[0].grid,
          },
        ],
        failures: [],
      }),
      onPanelsAdded: () => {},
      onPanelsRemoved: () => {},
    });

    expect(result.dashboardData.panels).toEqual([]);
    expect(result.dashboardData.sections?.[0].panels).toEqual([
      expect.objectContaining({
        panelId: 'section-routed-panel',
        grid: { x: 12, y: 0, w: 12, h: 5 },
      }),
    ]);
  });

  it('removes section and promotes panels when panelAction=promote', async () => {
    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [createLensPanel('top-1', 0)],
        sections: [
          {
            sectionId: 'section-a',
            title: 'Section A',
            collapsed: false,
            grid: { y: 20 },
            panels: [createLensPanel('section-a-1', 0), createLensPanel('section-a-2', 9)],
          },
        ],
      },
      operations: [{ operation: 'remove_section', sectionId: 'section-a', panelAction: 'promote' }],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      onPanelsAdded: () => {},
      onPanelsRemoved: () => {},
    });

    expect(result.dashboardData.sections).toBeUndefined();
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({ panelId: 'top-1', grid: { x: 0, y: 0, w: 24, h: 9 } }),
      expect.objectContaining({ panelId: 'section-a-1', grid: { x: 0, y: 9, w: 24, h: 9 } }),
      expect.objectContaining({ panelId: 'section-a-2', grid: { x: 0, y: 18, w: 24, h: 9 } }),
    ]);
  });

  it('removes section and deletes contained panels when panelAction=delete', async () => {
    const removedPanelIds: string[] = [];

    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [createLensPanel('top-1')],
        sections: [
          {
            sectionId: 'section-a',
            title: 'Section A',
            collapsed: false,
            grid: { y: 10 },
            panels: [createLensPanel('section-a-1', 0)],
          },
        ],
      },
      operations: [{ operation: 'remove_section', sectionId: 'section-a', panelAction: 'delete' }],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      onPanelsAdded: () => {},
      onPanelsRemoved: (panels) => {
        removedPanelIds.push(...panels.map(({ panelId }) => panelId));
      },
    });

    expect(result.dashboardData.sections).toBeUndefined();
    expect(result.dashboardData.panels).toEqual([expect.objectContaining({ panelId: 'top-1' })]);
    expect(removedPanelIds).toEqual(['section-a-1']);
  });

  it('removes matching panelIds from top-level and section panels', async () => {
    const removedPanelIds: string[] = [];

    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [createLensPanel('top-1')],
        sections: [
          {
            sectionId: 'section-a',
            title: 'Section A',
            collapsed: false,
            grid: { y: 8 },
            panels: [createLensPanel('section-a-1', 0), createLensPanel('section-a-2', 9)],
          },
        ],
      },
      operations: [{ operation: 'remove_panels', panelIds: ['section-a-1', 'top-1'] }],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      onPanelsAdded: () => {},
      onPanelsRemoved: (panels) => {
        removedPanelIds.push(...panels.map(({ panelId }) => panelId));
      },
    });

    expect(result.dashboardData.panels).toEqual([]);
    expect(result.dashboardData.sections).toEqual([
      {
        sectionId: 'section-a',
        title: 'Section A',
        collapsed: false,
        grid: { y: 8 },
        panels: [expect.objectContaining({ panelId: 'section-a-2' })],
      },
    ]);
    expect(removedPanelIds.sort()).toEqual(['section-a-1', 'top-1']);
  });

  it('adds markdown panel into a target section when sectionId is provided', async () => {
    const addedPanelIds: string[] = [];

    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [],
        sections: [
          {
            sectionId: 'section-a',
            title: 'Section A',
            collapsed: false,
            grid: { y: 0 },
            panels: [],
          },
        ],
      },
      operations: [
        {
          operation: 'add_markdown',
          markdownContent: '### Section Summary',
          grid: { x: 0, y: 0, w: 24, h: 4 },
          sectionId: 'section-a',
        },
      ],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      onPanelsAdded: (panels) => {
        addedPanelIds.push(...panels.map(({ panelId }) => panelId));
      },
      onPanelsRemoved: () => {},
    });

    expect(result.dashboardData.panels).toEqual([]);
    expect(result.dashboardData.sections?.[0].panels).toEqual([
      expect.objectContaining({
        type: MARKDOWN_EMBEDDABLE_TYPE,
        rawConfig: { content: '### Section Summary' },
        grid: { x: 0, y: 0, w: 24, h: 4 },
      }),
    ]);
    expect(addedPanelIds).toHaveLength(1);
  });

  describe('update_panels_from_attachments', () => {
    const createLensPanelWithSource = (
      panelId: string,
      sourceAttachmentId: string,
      gridY = 0
    ): AttachmentPanel => ({
      type: 'lens',
      panelId,
      visualization: { type: 'metric' },
      sourceAttachmentId,
      grid: { x: 0, y: gridY, w: 24, h: 9 },
    });

    it('updates a top-level panel from its source attachment, preserving panelId and grid', async () => {
      const originalPanel = createLensPanelWithSource('panel-1', 'viz-att-1', 5);
      const resolveFn = jest.fn().mockReturnValue({
        panels: [
          {
            type: 'lens',
            panelId: 'new-generated-id',
            visualization: { type: 'bar' },
            sourceAttachmentId: 'viz-att-1',
            grid: { x: 0, y: 5, w: 24, h: 9 },
          },
        ],
        failures: [],
      });

      const result = executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [originalPanel],
        },
        operations: [{ operation: 'update_panels_from_attachments', attachmentIds: ['viz-att-1'] }],
        logger,
        resolvePanelsFromAttachments: resolveFn,
        onPanelsAdded: () => {},
        onPanelsRemoved: () => {},
      });

      expect(resolveFn).toHaveBeenCalledWith([
        { attachmentId: 'viz-att-1', grid: { x: 0, y: 5, w: 24, h: 9 } },
      ]);

      expect(result.dashboardData.panels).toHaveLength(1);
      const updatedPanel = result.dashboardData.panels[0];
      expect(updatedPanel.panelId).toBe('panel-1');
      expect(updatedPanel.grid).toEqual({ x: 0, y: 5, w: 24, h: 9 });
      expect((updatedPanel as { visualization: unknown }).visualization).toEqual({ type: 'bar' });
      expect((updatedPanel as { sourceAttachmentId: string }).sourceAttachmentId).toBe('viz-att-1');
    });

    it('updates a panel inside a section', async () => {
      const sectionPanel = createLensPanelWithSource('sec-panel-1', 'viz-att-2', 0);

      const result = executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [],
          sections: [
            {
              sectionId: 'section-a',
              title: 'Section A',
              collapsed: false,
              grid: { y: 0 },
              panels: [sectionPanel],
            },
          ],
        },
        operations: [{ operation: 'update_panels_from_attachments', attachmentIds: ['viz-att-2'] }],
        logger,
        resolvePanelsFromAttachments: () => ({
          panels: [
            {
              type: 'lens',
              panelId: 'new-id',
              visualization: { type: 'line' },
              sourceAttachmentId: 'viz-att-2',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
          ],
          failures: [],
        }),
        onPanelsAdded: () => {},
        onPanelsRemoved: () => {},
      });

      const updatedPanel = result.dashboardData.sections?.[0].panels[0];
      expect(updatedPanel?.panelId).toBe('sec-panel-1');
      expect((updatedPanel as { visualization: unknown }).visualization).toEqual({ type: 'line' });
    });

    it('is a no-op when no panels match the attachment ID', async () => {
      const panel = createLensPanelWithSource('panel-1', 'viz-att-1');
      const resolveFn = jest.fn();

      const result = executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [panel],
        },
        operations: [
          { operation: 'update_panels_from_attachments', attachmentIds: ['non-existent'] },
        ],
        logger,
        resolvePanelsFromAttachments: resolveFn,
        onPanelsAdded: () => {},
        onPanelsRemoved: () => {},
      });

      expect(resolveFn).not.toHaveBeenCalled();
      expect(result.dashboardData.panels).toEqual([panel]);
    });

    it('records failures when attachment resolution fails and leaves panel unchanged', async () => {
      const panel = createLensPanelWithSource('panel-1', 'viz-att-1');

      const result = executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [panel],
        },
        operations: [{ operation: 'update_panels_from_attachments', attachmentIds: ['viz-att-1'] }],
        logger,
        resolvePanelsFromAttachments: () => {
          throw new Error('Attachment not found');
        },
        onPanelsAdded: () => {},
        onPanelsRemoved: () => {},
      });

      expect(result.dashboardData.panels[0]).toEqual(panel);
      expect(result.failures).toEqual([
        expect.objectContaining({
          type: 'update_panels',
          identifier: 'viz-att-1',
          error: 'Attachment not found',
        }),
      ]);
    });

    it('emits remove+add UI events for updated panels', async () => {
      const events: string[] = [];
      const panel = createLensPanelWithSource('panel-1', 'viz-att-1');

      executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [panel],
        },
        operations: [{ operation: 'update_panels_from_attachments', attachmentIds: ['viz-att-1'] }],
        logger,
        resolvePanelsFromAttachments: () => ({
          panels: [
            {
              type: 'lens',
              panelId: 'new-id',
              visualization: { type: 'bar' },
              sourceAttachmentId: 'viz-att-1',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
          ],
          failures: [],
        }),
        onPanelsAdded: (panels) => {
          for (const p of panels) events.push(`added:${p.panelId}`);
        },
        onPanelsRemoved: (panels) => {
          for (const p of panels) events.push(`removed:${p.panelId}`);
        },
      });

      expect(events).toEqual(['removed:panel-1', 'added:panel-1']);
    });
  });

  it('throws when add_markdown references an invalid sectionId', () => {
    expect(() =>
      executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        operations: [
          {
            operation: 'add_markdown',
            markdownContent: '### Summary',
            grid: { x: 0, y: 0, w: 48, h: 5 },
            sectionId: 'nonexistent-section',
          },
        ],
        logger,
        resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
        onPanelsAdded: () => {},
        onPanelsRemoved: () => {},
      })
    ).toThrow('Section "nonexistent-section" not found.');
  });
});
