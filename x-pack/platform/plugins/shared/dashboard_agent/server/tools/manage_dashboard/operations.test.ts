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
import type { ResolveVisualizationConfig, VisualizationAttempt } from './inline_visualization';
import { executeDashboardOperations, type DashboardOperation } from './operations';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const getSections = (panels: DashboardAttachmentData['panels']): DashboardSection[] =>
  panels.filter(isSection);

const getPanelsOnly = (panels: DashboardAttachmentData['panels']): AttachmentPanel[] =>
  panels.filter((p): p is AttachmentPanel => !isSection(p));

describe('executeDashboardOperations', () => {
  const logger = createMockLogger();
  const createLensPanel = (id: string, gridY = 0): AttachmentPanel => ({
    type: LENS_EMBEDDABLE_TYPE,
    id,
    config: { type: 'metric' },
    grid: { x: 0, y: gridY, w: 24, h: 9 },
  });

  const createSection = (
    id: string,
    title: string,
    gridY: number,
    panels: AttachmentPanel[] = []
  ): DashboardSection => ({
    id,
    title,
    collapsed: false,
    grid: { y: gridY },
    panels,
  });

  const createResolvedVisualization = (
    visContent: Pick<AttachmentPanel, 'type' | 'config'>
  ): VisualizationAttempt => ({
    type: 'success',
    visContent,
  });

  const createResolveVisualizationConfig = (
    resultsByIdentifier: Record<string, VisualizationAttempt> = {}
  ): ResolveVisualizationConfig => {
    return async ({ identifier }) =>
      resultsByIdentifier[identifier] ??
      createResolvedVisualization({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric' } });
  };

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

    const result = await executeDashboardOperations({
      dashboardData: baseDashboardData,
      operations,
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [attachmentPanel], failures: [] }),
    });

    expect(result.dashboardData.title).toBe('Updated title');
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({
        id: 'from-attachment-panel',
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
      expect.objectContaining({ id: 'from-attachment' }),
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
        id: 'section-1',
        title: 'Section 1',
        collapsed: false,
        grid: { y: 10 },
        panels: [],
      },
    ]);
    expect(result.dashboardData.panels).toHaveLength(2); // 1 section + 1 panel
  });

  it('adds an empty section with generated sectionId and default collapsed=false', async () => {
    const result = await executeDashboardOperations({
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
      id: expect.any(String),
      title: 'Overview',
      collapsed: false,
      grid: { y: 12 },
      panels: [],
    });
  });

  it('adds a section with inline visualization panels in a single operation', async () => {
    const result = await executeDashboardOperations({
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
          panels: [
            {
              query: 'show total requests',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
            {
              query: 'show error rate',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      resolveVisualizationConfig: createResolveVisualizationConfig({
        'show total requests': createResolvedVisualization({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
        }),
        'show error rate': createResolvedVisualization({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'bar' },
        }),
      }),
    });

    const panelsOnly = getPanelsOnly(result.dashboardData.panels);
    const sections = getSections(result.dashboardData.panels);

    expect(panelsOnly).toEqual([]);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toEqual({
      id: expect.any(String),
      title: 'Overview',
      collapsed: false,
      grid: { y: 12 },
      panels: [
        expect.objectContaining({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
          grid: { x: 0, y: 0, w: 24, h: 9 },
        }),
        expect.objectContaining({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'bar' },
          grid: { x: 24, y: 0, w: 24, h: 9 },
        }),
      ],
    });
  });

  it('records inline visualization failures when adding a section and keeps successful panels', async () => {
    const result = await executeDashboardOperations({
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
          panels: [
            {
              query: 'show total requests',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
            {
              query: 'show p95 latency',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      resolveVisualizationConfig: createResolveVisualizationConfig({
        'show total requests': createResolvedVisualization({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
        }),
        'show p95 latency': {
          type: 'failure',
          failure: {
            type: 'add_section',
            identifier: 'show p95 latency',
            error: 'ES|QL generation failed',
          },
        },
      }),
    });

    const sections = getSections(result.dashboardData.panels);

    expect(sections).toHaveLength(1);
    expect(sections[0].panels).toEqual([
      expect.objectContaining({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
        grid: { x: 0, y: 0, w: 24, h: 9 },
      }),
    ]);
    expect(result.failures).toEqual([
      {
        type: 'add_section',
        identifier: 'show p95 latency',
        error: 'ES|QL generation failed',
      },
    ]);
  });

  it('resolves inline panels for multiple section creations in parallel', async () => {
    const firstSectionPanel = createDeferred<VisualizationAttempt>();
    const secondSectionPanel = createDeferred<VisualizationAttempt>();
    const resolveVisualizationConfig = jest.fn<
      ReturnType<ResolveVisualizationConfig>,
      Parameters<ResolveVisualizationConfig>
    >(async ({ nlQuery }) => {
      if (nlQuery === 'show total requests') {
        return firstSectionPanel.promise;
      }

      return secondSectionPanel.promise;
    });

    const resultPromise = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [],
      },
      operations: [
        {
          operation: 'add_section',
          title: 'Overview',
          grid: { y: 0 },
          panels: [
            {
              query: 'show total requests',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
          ],
        },
        {
          operation: 'add_section',
          title: 'Errors',
          grid: { y: 1 },
          panels: [
            {
              query: 'show error rate',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      resolveVisualizationConfig,
    });

    await Promise.resolve();

    expect(resolveVisualizationConfig).toHaveBeenCalledTimes(2);
    expect(resolveVisualizationConfig).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        operationType: 'add_section',
        identifier: 'show total requests',
      })
    );
    expect(resolveVisualizationConfig).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        operationType: 'add_section',
        identifier: 'show error rate',
      })
    );

    secondSectionPanel.resolve(
      createResolvedVisualization({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'bar' },
      })
    );
    firstSectionPanel.resolve(
      createResolvedVisualization({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
      })
    );

    const result = await resultPromise;

    expect(getSections(result.dashboardData.panels)).toEqual([
      expect.objectContaining({
        title: 'Overview',
        panels: [expect.objectContaining({ config: { type: 'metric' } })],
      }),
      expect.objectContaining({
        title: 'Errors',
        panels: [expect.objectContaining({ config: { type: 'bar' } })],
      }),
    ]);
  });

  it('pre-resolves top-level visualization creations alongside section creations', async () => {
    const sectionPanel = createDeferred<VisualizationAttempt>();
    const topLevelPanel = createDeferred<VisualizationAttempt>();
    const resolveVisualizationConfig = jest.fn<
      ReturnType<ResolveVisualizationConfig>,
      Parameters<ResolveVisualizationConfig>
    >(async ({ nlQuery }) => {
      if (nlQuery === 'show total requests') {
        return sectionPanel.promise;
      }

      return topLevelPanel.promise;
    });

    const resultPromise = executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [],
      },
      operations: [
        {
          operation: 'add_section',
          title: 'Overview',
          grid: { y: 0 },
          panels: [
            {
              query: 'show total requests',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
          ],
        },
        {
          operation: 'create_visualization_panels',
          panels: [
            {
              query: 'show error rate',
              grid: { x: 0, y: 1, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      resolveVisualizationConfig,
    });

    await Promise.resolve();

    expect(resolveVisualizationConfig).toHaveBeenCalledTimes(2);
    expect(resolveVisualizationConfig).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        operationType: 'add_section',
        identifier: 'show total requests',
      })
    );
    expect(resolveVisualizationConfig).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        operationType: 'create_visualization_panels',
        identifier: 'show error rate',
      })
    );

    topLevelPanel.resolve(
      createResolvedVisualization({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'bar' },
      })
    );
    sectionPanel.resolve(
      createResolvedVisualization({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
      })
    );

    const result = await resultPromise;

    expect(getSections(result.dashboardData.panels)).toEqual([
      expect.objectContaining({
        title: 'Overview',
        panels: [expect.objectContaining({ config: { type: 'metric' } })],
      }),
    ]);
    expect(getPanelsOnly(result.dashboardData.panels)).toEqual([
      expect.objectContaining({ config: { type: 'bar' } }),
    ]);
  });

  it('throws once up front when visualization creation operations are present without a resolver', async () => {
    await expect(
      executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        operations: [
          {
            operation: 'add_section',
            title: 'Overview',
            grid: { y: 0 },
            panels: [
              {
                query: 'show total requests',
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
            ],
          },
          {
            operation: 'create_visualization_panels',
            panels: [
              {
                query: 'show error rate',
                grid: { x: 24, y: 0, w: 24, h: 9 },
              },
            ],
          },
        ],
        logger,
        resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      })
    ).rejects.toThrow(
      'Inline visualization resolver is required for visualization creation operations.'
    );
  });

  it('adds attachment panels into a target section when sectionId is provided', async () => {
    const result = await executeDashboardOperations({
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
        id: 'section-routed-panel',
        grid: { x: 12, y: 0, w: 12, h: 5 },
      }),
    ]);
  });

  it('removes section and promotes panels when panelAction=promote', async () => {
    const result = await executeDashboardOperations({
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
      operations: [{ operation: 'remove_section', id: 'section-a', panelAction: 'promote' }],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
    });
    const sections = getSections(result.dashboardData.panels);
    expect(sections).toHaveLength(0);
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({ id: 'top-1', grid: { x: 0, y: 0, w: 24, h: 9 } }),
      expect.objectContaining({ id: 'section-a-1', grid: { x: 0, y: 9, w: 24, h: 9 } }),
      expect.objectContaining({ id: 'section-a-2', grid: { x: 0, y: 18, w: 24, h: 9 } }),
    ]);
  });

  it('removes section and deletes contained panels when panelAction=delete', async () => {
    const result = await executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [
          createLensPanel('top-1'),
          createSection('section-a', 'Section A', 10, [createLensPanel('section-a-1', 0)]),
        ],
      },
      operations: [{ operation: 'remove_section', id: 'section-a', panelAction: 'delete' }],
      logger,
      resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
    });

    const sections = getSections(result.dashboardData.panels);
    expect(sections).toHaveLength(0);
    expect(result.dashboardData.panels).toEqual([expect.objectContaining({ id: 'top-1' })]);
  });

  it('removes matching panelIds from top-level and section panels', async () => {
    const result = await executeDashboardOperations({
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
        id: 'section-a',
        title: 'Section A',
        collapsed: false,
        grid: { y: 8 },
        panels: [expect.objectContaining({ id: 'section-a-2' })],
      },
    ]);
  });

  it('adds markdown panel into a target section when sectionId is provided', async () => {
    const result = await executeDashboardOperations({
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

  describe('update_panel_layouts', () => {
    it('updates panel grid without changing its current location', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [
            createSection('section-a', 'Section A', 0, [createLensPanel('section-panel-1', 0)]),
          ],
        },
        operations: [
          {
            operation: 'update_panel_layouts',
            panels: [
              {
                panelId: 'section-panel-1',
                grid: { x: 12, y: 4, w: 12, h: 6 },
              },
            ],
          },
        ],
        logger,
        resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      });

      const sections = getSections(result.dashboardData.panels);
      expect(sections[0].panels).toEqual([
        expect.objectContaining({
          id: 'section-panel-1',
          grid: { x: 12, y: 4, w: 12, h: 6 },
          config: { type: 'metric' },
        }),
      ]);
    });

    it('moves a top-level panel into a section', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [createLensPanel('top-1'), createSection('section-a', 'Section A', 10)],
        },
        operations: [
          {
            operation: 'update_panel_layouts',
            panels: [
              {
                panelId: 'top-1',
                sectionId: 'section-a',
                grid: { x: 24, y: 0, w: 24, h: 9 },
              },
            ],
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
          id: 'top-1',
          grid: { x: 24, y: 0, w: 24, h: 9 },
          config: { type: 'metric' },
        }),
      ]);
    });

    it('promotes a section panel to the top level when sectionId is null', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [
            createSection('section-a', 'Section A', 0, [createLensPanel('section-panel-1', 0)]),
          ],
        },
        operations: [
          {
            operation: 'update_panel_layouts',
            panels: [
              {
                panelId: 'section-panel-1',
                sectionId: null,
                grid: { x: 0, y: 20, w: 24, h: 9 },
              },
            ],
          },
        ],
        logger,
        resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      });

      const panelsOnly = getPanelsOnly(result.dashboardData.panels);
      const sections = getSections(result.dashboardData.panels);

      expect(sections[0].panels).toEqual([]);
      expect(panelsOnly).toEqual([
        expect.objectContaining({
          id: 'section-panel-1',
          grid: { x: 0, y: 20, w: 24, h: 9 },
          config: { type: 'metric' },
        }),
      ]);
    });

    it('records a failure when the target panel is missing', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        operations: [
          {
            operation: 'update_panel_layouts',
            panels: [{ panelId: 'missing-panel', grid: { x: 0, y: 0, w: 24, h: 9 } }],
          },
        ],
        logger,
        resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
      });

      expect(result.failures).toEqual([
        {
          type: 'update_panel_layouts',
          identifier: 'missing-panel',
          error: 'Panel "missing-panel" not found.',
        },
      ]);
    });
  });

  describe('inline visualization operations', () => {
    it('creates inline visualization panels at the top level and inside sections', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createSection('section-a', 'Section A', 0)],
        },
        operations: [
          {
            operation: 'create_visualization_panels',
            panels: [
              {
                query: 'show total requests',
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
              {
                query: 'show error rate',
                sectionId: 'section-a',
                grid: { x: 24, y: 0, w: 24, h: 9 },
              },
            ],
          },
        ],
        logger,
        resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
        resolveVisualizationConfig: createResolveVisualizationConfig({
          'show total requests': createResolvedVisualization({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          'show error rate': createResolvedVisualization({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'bar' },
          }),
        }),
      });

      const topLevelPanels = getPanelsOnly(result.dashboardData.panels);
      const sections = getSections(result.dashboardData.panels);

      expect(topLevelPanels).toEqual([
        expect.objectContaining({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
          grid: { x: 0, y: 0, w: 24, h: 9 },
        }),
      ]);
      expect(sections[0].panels).toEqual([
        expect.objectContaining({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'bar' },
          grid: { x: 24, y: 0, w: 24, h: 9 },
        }),
      ]);
    });

    it('edits inline visualization panels while preserving id and grid', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [
            createLensPanel('panel-1', 5),
            createSection('section-a', 'Section A', 0, [createLensPanel('section-panel-1', 0)]),
          ],
        },
        operations: [
          {
            operation: 'edit_visualization_panels',
            panels: [
              { panelId: 'panel-1', query: 'turn this into a bar chart' },
              { panelId: 'section-panel-1', query: 'turn this into a line chart' },
            ],
          },
        ],
        logger,
        resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
        resolveVisualizationConfig: createResolveVisualizationConfig({
          'panel-1': createResolvedVisualization({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'bar' },
          }),
          'section-panel-1': createResolvedVisualization({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'line' },
          }),
        }),
      });

      const topLevelPanels = getPanelsOnly(result.dashboardData.panels);
      const sections = getSections(result.dashboardData.panels);

      expect(topLevelPanels[0]).toEqual(
        expect.objectContaining({
          id: 'panel-1',
          grid: { x: 0, y: 5, w: 24, h: 9 },
          config: { type: 'bar' },
        })
      );
      expect(sections[0].panels[0]).toEqual(
        expect.objectContaining({
          id: 'section-panel-1',
          grid: { x: 0, y: 0, w: 24, h: 9 },
          config: { type: 'line' },
        })
      );
    });

    it('resolves repeated visualization edits against the latest panel state', async () => {
      const seenConfigSteps: string[] = [];

      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createLensPanel('panel-1', 5)],
        },
        operations: [
          {
            operation: 'edit_visualization_panels',
            panels: [{ panelId: 'panel-1', query: 'make this a bar chart' }],
          },
          {
            operation: 'edit_visualization_panels',
            panels: [{ panelId: 'panel-1', query: 'now make this a line chart' }],
          },
        ],
        logger,
        resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
        resolveVisualizationConfig: async (params) => {
          const { nlQuery } = params;
          const config = params.existingPanel?.config as
            | { attributes?: { testStep?: string }; testStep?: string }
            | undefined;
          const configStep = config?.attributes?.testStep ?? config?.testStep ?? 'initial';
          seenConfigSteps.push(configStep);

          if (nlQuery === 'make this a bar chart') {
            return createResolvedVisualization({
              type: LENS_EMBEDDABLE_TYPE,
              config: { type: 'metric', testStep: 'after-first-edit' },
            });
          }

          return createResolvedVisualization({
            type: LENS_EMBEDDABLE_TYPE,
            config: {
              type: 'metric',
              testStep: configStep === 'after-first-edit' ? 'after-second-edit' : 'stale-edit',
            },
          });
        },
      });

      expect(seenConfigSteps).toEqual(['initial', 'after-first-edit']);
      expect(getPanelsOnly(result.dashboardData.panels)[0]).toEqual(
        expect.objectContaining({
          id: 'panel-1',
          config: { type: 'metric', testStep: 'after-second-edit' },
          grid: { x: 0, y: 5, w: 24, h: 9 },
        })
      );
    });

    it('does not resolve visualization edits for panels removed earlier in the sequence', async () => {
      const resolveVisualizationConfig = jest.fn<
        ReturnType<ResolveVisualizationConfig>,
        Parameters<ResolveVisualizationConfig>
      >(async () =>
        createResolvedVisualization({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'bar' } })
      );

      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createLensPanel('panel-1', 5)],
        },
        operations: [
          { operation: 'remove_panels', panelIds: ['panel-1'] },
          {
            operation: 'edit_visualization_panels',
            panels: [{ panelId: 'panel-1', query: 'make this a bar chart' }],
          },
        ],
        logger,
        resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
        resolveVisualizationConfig,
      });

      expect(resolveVisualizationConfig).not.toHaveBeenCalled();
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(result.failures).toEqual([
        {
          type: 'edit_visualization_panels',
          identifier: 'panel-1',
          error: 'Panel "panel-1" not found.',
        },
      ]);
    });

    it('skips failed inline visualization resolutions and records the failure', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [],
        },
        operations: [
          {
            operation: 'create_visualization_panels',
            panels: [
              {
                query: 'show total requests',
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
              {
                query: 'show p95 latency',
                grid: { x: 24, y: 0, w: 24, h: 9 },
              },
            ],
          },
        ],
        logger,
        resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
        resolveVisualizationConfig: createResolveVisualizationConfig({
          'show total requests': createResolvedVisualization({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          'show p95 latency': {
            type: 'failure',
            failure: {
              type: 'create_visualization_panels',
              identifier: 'show p95 latency',
              error: 'ES|QL generation failed',
            },
          },
        }),
      });

      expect(getPanelsOnly(result.dashboardData.panels)).toHaveLength(1);
      expect(result.failures).toEqual([
        {
          type: 'create_visualization_panels',
          identifier: 'show p95 latency',
          error: 'ES|QL generation failed',
        },
      ]);
    });

    it('records a failure when editing a non-lens panel inline', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [
            {
              type: 'aiOpsLogRateAnalysis',
              id: 'panel-1',
              config: { seriesType: 'log_rate' },
              grid: { x: 0, y: 5, w: 24, h: 9 },
            },
          ],
        },
        operations: [
          {
            operation: 'edit_visualization_panels',
            panels: [{ panelId: 'panel-1', query: 'refine this analysis' }],
          },
        ],
        logger,
        resolvePanelsFromAttachments: () => ({ panels: [], failures: [] }),
        resolveVisualizationConfig: createResolveVisualizationConfig({
          'panel-1': {
            type: 'failure',
            failure: {
              type: 'edit_visualization_panels',
              identifier: 'panel-1',
              error:
                'Panel "panel-1" with type "aiOpsLogRateAnalysis" is not supported for inline visualization editing.',
            },
          },
        }),
      });

      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([
        expect.objectContaining({
          id: 'panel-1',
          type: 'aiOpsLogRateAnalysis',
          config: { seriesType: 'log_rate' },
          grid: { x: 0, y: 5, w: 24, h: 9 },
        }),
      ]);
      expect(result.failures).toEqual([
        {
          type: 'edit_visualization_panels',
          identifier: 'panel-1',
          error:
            'Panel "panel-1" with type "aiOpsLogRateAnalysis" is not supported for inline visualization editing.',
        },
      ]);
    });
  });

  it('throws when add_markdown references an invalid sectionId', async () => {
    await expect(
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
    ).rejects.toThrow('Section "nonexistent-section" not found.');
  });
});
