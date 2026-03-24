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
  DashboardSection,
} from '@kbn/dashboard-agent-common';
import { isSection } from '@kbn/dashboard-agent-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import { executeDashboardOperations, type DashboardOperation } from './operations';

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const getSections = (panels: DashboardAttachmentData['panels']): DashboardSection[] =>
  panels.filter(isSection);

const getPanelsOnly = (panels: DashboardAttachmentData['panels']): AttachmentPanel[] =>
  panels.filter((p): p is AttachmentPanel => !isSection(p));

describe('executeDashboardOperations', () => {
  const logger = createMockLogger();
  const createLensPanel = (uid: string, gridY = 0): AttachmentPanel => ({
    type: 'lens',
    uid,
    config: { type: 'metric' },
    grid: { x: 0, y: gridY, w: 24, h: 9 },
  });

  const createSection = (
    uid: string,
    title: string,
    gridY: number,
    panels: AttachmentPanel[] = []
  ): DashboardSection => ({
    uid,
    title,
    collapsed: false,
    grid: { y: gridY },
    panels,
  });

  it('executes operations in order', async () => {
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
    });

    expect(result.dashboardData.title).toBe('Updated title');
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({
        uid: 'from-attachment-panel',
        grid: { x: 0, y: 0, w: 24, h: 9 },
      }),
      expect.objectContaining({
        type: MARKDOWN_EMBEDDABLE_TYPE,
        grid: { x: 0, y: 9, w: 48, h: 5 },
      }),
    ]);
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
    });

    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({ uid: 'from-attachment' }),
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
        panels: [createSection('section-1', 'Section 1', 10)],
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
    });

    const sections = getSections(result.dashboardData.panels);
    expect(sections).toEqual([
      {
        uid: 'section-1',
        title: 'Section 1',
        collapsed: false,
        grid: { y: 10 },
        panels: [],
      },
    ]);
    expect(result.dashboardData.panels).toHaveLength(2); // 1 section + 1 panel
  });

  it('adds a section with generated sectionId and default collapsed=false', async () => {
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
    });

    const sections = getSections(result.dashboardData.panels);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toEqual({
      uid: expect.any(String),
      title: 'Overview',
      collapsed: false,
      grid: { y: 12 },
      panels: [
        expect.objectContaining({
          uid: 'section-panel-1',
          grid: { x: 0, y: 0, w: 24, h: 9 },
        }),
      ],
    });
  });

  it('adds attachment panels into a target section when sectionId is provided', async () => {
    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [createSection('section-a', 'Section A', 8)],
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
    });

    const panelsOnly = getPanelsOnly(result.dashboardData.panels);
    const sections = getSections(result.dashboardData.panels);
    expect(panelsOnly).toEqual([]);
    expect(sections[0].panels).toEqual([
      expect.objectContaining({
        uid: 'section-routed-panel',
        grid: { x: 12, y: 0, w: 12, h: 5 },
      }),
    ]);
  });

  it('removes section and promotes panels when panelAction=promote', async () => {
    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [
          createLensPanel('top-1', 0),
          createSection('section-a', 'Section A', 20, [
            createLensPanel('section-a-1', 0),
            createLensPanel('section-a-2', 9),
          ]),
        ],
      },
      operations: [{ operation: 'remove_section', uid: 'section-a', panelAction: 'promote' }],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
    });
    const sections = getSections(result.dashboardData.panels);
    expect(sections).toHaveLength(0);
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({ uid: 'top-1', grid: { x: 0, y: 0, w: 24, h: 9 } }),
      expect.objectContaining({ uid: 'section-a-1', grid: { x: 0, y: 9, w: 24, h: 9 } }),
      expect.objectContaining({ uid: 'section-a-2', grid: { x: 0, y: 18, w: 24, h: 9 } }),
    ]);
  });

  it('removes section and deletes contained panels when panelAction=delete', async () => {
    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [
          createLensPanel('top-1'),
          createSection('section-a', 'Section A', 10, [createLensPanel('section-a-1', 0)]),
        ],
      },
      operations: [{ operation: 'remove_section', uid: 'section-a', panelAction: 'delete' }],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
    });

    const sections = getSections(result.dashboardData.panels);
    expect(sections).toHaveLength(0);
    expect(result.dashboardData.panels).toEqual([expect.objectContaining({ uid: 'top-1' })]);
  });

  it('removes matching panelIds from top-level and section panels', async () => {
    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [
          createLensPanel('top-1'),
          createSection('section-a', 'Section A', 8, [
            createLensPanel('section-a-1', 0),
            createLensPanel('section-a-2', 9),
          ]),
        ],
      },
      operations: [{ operation: 'remove_panels', panelIds: ['section-a-1', 'top-1'] }],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
    });

    const panelsOnly = getPanelsOnly(result.dashboardData.panels);
    const sections = getSections(result.dashboardData.panels);
    expect(panelsOnly).toEqual([]);
    expect(sections).toEqual([
      {
        uid: 'section-a',
        title: 'Section A',
        collapsed: false,
        grid: { y: 8 },
        panels: [expect.objectContaining({ uid: 'section-a-2' })],
      },
    ]);
  });

  it('adds markdown panel into a target section when sectionId is provided', async () => {
    const result = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [createSection('section-a', 'Section A', 0)],
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
    });

    const panelsOnly = getPanelsOnly(result.dashboardData.panels);
    const sections = getSections(result.dashboardData.panels);
    expect(panelsOnly).toEqual([]);
    expect(sections[0].panels).toEqual([
      expect.objectContaining({
        type: MARKDOWN_EMBEDDABLE_TYPE,
        config: { content: '### Section Summary' },
        grid: { x: 0, y: 0, w: 24, h: 4 },
      }),
    ]);
  });

  describe('update_panels_from_attachments', () => {
    const createLensPanelWithSource = (
      uid: string,
      sourceAttachmentId: string,
      gridY = 0
    ): AttachmentPanel => ({
      type: 'lens',
      uid,
      config: { type: 'metric' },
      sourceAttachmentId,
      grid: { x: 0, y: gridY, w: 24, h: 9 },
    });

    it('updates a top-level panel from its source attachment, preserving uid and grid', async () => {
      const originalPanel = createLensPanelWithSource('panel-1', 'viz-att-1', 5);
      const resolveFn = jest.fn().mockReturnValue({
        panels: [
          {
            type: 'lens',
            uid: 'new-generated-id',
            config: { type: 'bar' },
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
      });

      expect(resolveFn).toHaveBeenCalledWith([
        { attachmentId: 'viz-att-1', grid: { x: 0, y: 5, w: 24, h: 9 } },
      ]);

      const panelsOnly = getPanelsOnly(result.dashboardData.panels);
      expect(panelsOnly).toHaveLength(1);
      const updatedPanel = panelsOnly[0];
      expect(updatedPanel.uid).toBe('panel-1');
      expect(updatedPanel.grid).toEqual({ x: 0, y: 5, w: 24, h: 9 });
      expect(updatedPanel.config).toEqual({ type: 'bar' });
      expect(updatedPanel.sourceAttachmentId).toBe('viz-att-1');
    });

    it('updates a panel inside a section', async () => {
      const sectionPanel = createLensPanelWithSource('sec-panel-1', 'viz-att-2', 0);

      const result = executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createSection('section-a', 'Section A', 0, [sectionPanel])],
        },
        operations: [{ operation: 'update_panels_from_attachments', attachmentIds: ['viz-att-2'] }],
        logger,
        resolvePanelsFromAttachments: () => ({
          panels: [
            {
              type: 'lens',
              uid: 'new-id',
              config: { type: 'line' },
              sourceAttachmentId: 'viz-att-2',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
          ],
          failures: [],
        }),
      });

      const sections = getSections(result.dashboardData.panels);
      const updatedPanel = sections[0].panels[0];
      expect(updatedPanel?.uid).toBe('sec-panel-1');
      expect((updatedPanel as { config: unknown }).config).toEqual({ type: 'line' });
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
      });

      const panelsOnly = getPanelsOnly(result.dashboardData.panels);
      expect(panelsOnly[0]).toEqual(panel);
      expect(result.failures).toEqual([
        expect.objectContaining({
          type: 'update_panels',
          identifier: 'viz-att-1',
          error: 'Attachment not found',
        }),
      ]);
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
      })
    ).toThrow('Section "nonexistent-section" not found.');
  });
});
