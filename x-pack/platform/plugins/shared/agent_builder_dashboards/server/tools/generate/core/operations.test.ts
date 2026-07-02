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
} from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import type { PanelContentAttempt, PanelResolutionRequestBase } from './resolve_panel';
import {
  PANEL_TYPE_DEFINITIONS,
  definePanelType,
  type PanelResolutionRequest,
  type PanelResolutionSourceInput,
  type PanelTypeDefinition,
  type ResolvePanelContent,
} from './operations/panels';
import {
  executeDashboardOperations,
  dashboardOperationSchema,
  type DashboardOperation,
} from './operations';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from './failure_types';

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

const waitForNextEventLoopTurn = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

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

  const createMarkdownPanel = (
    id: string,
    content: string,
    grid: AttachmentPanel['grid'] = { x: 0, y: 0, w: 48, h: 5 }
  ): AttachmentPanel => ({
    id,
    type: MARKDOWN_EMBEDDABLE_TYPE,
    config: { content },
    grid,
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

  const createResolvedPanelContent = (
    panelContent: Pick<AttachmentPanel, 'type' | 'config'>
  ): PanelContentAttempt => ({
    type: 'success',
    panelContent,
  });

  const createResolvePanelContent = (
    resultsByIdentifier: Record<string, PanelContentAttempt> = {}
  ): ResolvePanelContent => {
    return async ({ identifier }) =>
      resultsByIdentifier[identifier] ??
      createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric' } });
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

    const operations: DashboardOperation[] = [
      { operation: 'set_metadata', title: 'Updated title' },
      { operation: 'remove_panels', panelIds: ['existing-panel'] },
      {
        operation: 'add_panels',
        panels: [
          {
            source: 'config',
            type: 'vis',
            config: { type: 'metric' },
            grid: { x: 0, y: 0, w: 24, h: 9 },
          },
          {
            source: 'config',
            type: 'markdown',
            config: { content: '### Updated summary' },
            grid: { x: 0, y: 9, w: 48, h: 5 },
          },
        ],
      },
    ];

    const result = await executeDashboardOperations({
      dashboardData: baseDashboardData,
      operations,
      logger,
    });

    expect(result.dashboardData.title).toBe('Updated title');
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
        grid: { x: 0, y: 0, w: 24, h: 9 },
      }),
      expect.objectContaining({
        type: MARKDOWN_EMBEDDABLE_TYPE,
        grid: { x: 0, y: 9, w: 48, h: 5 },
      }),
    ]);
  });

  it('adds config-source panels successfully', async () => {
    const result = await executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [],
      },
      operations: [
        {
          operation: 'add_panels',
          panels: [
            {
              source: 'config',
              type: 'vis',
              config: { type: 'metric' },
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
            {
              source: 'config',
              type: 'vis',
              config: { type: 'metric' },
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
        {
          operation: 'add_panels',
          panels: [
            {
              source: 'config',
              type: 'vis',
              config: { type: 'metric' },
              grid: { x: 0, y: 9, w: 12, h: 5 },
            },
          ],
        },
      ],
      logger,
    });

    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
        grid: { x: 0, y: 0, w: 24, h: 9 },
      }),
      expect.objectContaining({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
        grid: { x: 24, y: 0, w: 24, h: 9 },
      }),
      expect.objectContaining({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
        grid: { x: 0, y: 9, w: 12, h: 5 },
      }),
    ]);
    expect(result.failures).toEqual([]);
  });

  it('adds mixed panel kinds in input order across top-level and section targets', async () => {
    const result = await executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [createSection('section-a', 'Section A', 8)],
      },
      operations: [
        {
          operation: 'add_panels',
          panels: [
            {
              source: 'config',
              type: 'markdown',
              config: { content: '### Summary' },
              grid: { x: 0, y: 0, w: 24, h: 4 },
            },
            {
              source: 'config',
              type: 'vis',
              config: { type: 'metric' },
              sectionId: 'section-a',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
            {
              source: 'request',
              type: 'vis',
              query: 'show total requests',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
            {
              source: 'config',
              type: 'vis',
              config: { type: 'metric' },
              grid: { x: 0, y: 9, w: 24, h: 9 },
            },
            {
              source: 'request',
              type: 'vis',
              query: 'show p95 latency',
              sectionId: 'section-a',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolvePanelContent: createResolvePanelContent({
        'show total requests': createResolvedPanelContent({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
        }),
        'show p95 latency': {
          type: 'failure',
          failure: {
            type: 'add_panels',
            identifier: 'show p95 latency',
            error: 'ES|QL generation failed',
          },
        },
      }),
    });

    expect(getPanelsOnly(result.dashboardData.panels)).toEqual([
      expect.objectContaining({
        type: MARKDOWN_EMBEDDABLE_TYPE,
        config: { content: '### Summary' },
      }),
      expect.objectContaining({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
        grid: { x: 24, y: 0, w: 24, h: 9 },
      }),
      expect.objectContaining({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
        grid: { x: 0, y: 9, w: 24, h: 9 },
      }),
    ]);
    expect(getSections(result.dashboardData.panels)[0].panels).toEqual([
      expect.objectContaining({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
        grid: { x: 0, y: 0, w: 24, h: 9 },
      }),
    ]);
    expect(result.failures).toEqual([
      {
        type: 'add_panels',
        identifier: 'show p95 latency',
        error: 'ES|QL generation failed',
        operationIndex: 0,
      },
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
          operation: 'add_panels',
          panels: [
            {
              source: 'config',
              type: 'vis',
              config: { type: 'metric' },
              grid: { x: 0, y: 0, w: 12, h: 5 },
            },
          ],
        },
      ],
      logger,
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
              source: 'request',
              type: 'vis',
              query: 'show total requests',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
            {
              source: 'request',
              type: 'vis',
              query: 'show error rate',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolvePanelContent: createResolvePanelContent({
        'show total requests': createResolvedPanelContent({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
        }),
        'show error rate': createResolvedPanelContent({
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
              source: 'request',
              type: 'vis',
              query: 'show total requests',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
            {
              source: 'request',
              type: 'vis',
              query: 'show p95 latency',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolvePanelContent: createResolvePanelContent({
        'show total requests': createResolvedPanelContent({
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
        operationIndex: 0,
      },
    ]);
  });

  it('adds non-visualization section panels without invoking the visualization resolver', async () => {
    const resolvePanelContent = jest.fn<
      ReturnType<ResolvePanelContent>,
      Parameters<ResolvePanelContent>
    >();

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
              source: 'config',
              type: 'markdown',
              config: { content: '### Section Summary' },
              grid: { x: 0, y: 0, w: 24, h: 4 },
            },
            {
              source: 'config',
              type: 'vis',
              config: { type: 'metric' },
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolvePanelContent,
    });

    expect(resolvePanelContent).not.toHaveBeenCalled();
    expect(getSections(result.dashboardData.panels)[0].panels).toEqual([
      expect.objectContaining({
        type: MARKDOWN_EMBEDDABLE_TYPE,
        config: { content: '### Section Summary' },
      }),
      expect.objectContaining({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
        grid: { x: 24, y: 0, w: 24, h: 9 },
      }),
    ]);
  });

  it('resolves inline panels for multiple section creations in parallel', async () => {
    const firstSectionPanel = createDeferred<PanelContentAttempt>();
    const secondSectionPanel = createDeferred<PanelContentAttempt>();
    const resolvePanelContent = jest.fn<
      ReturnType<ResolvePanelContent>,
      Parameters<ResolvePanelContent>
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
              source: 'request',
              type: 'vis',
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
              source: 'request',
              type: 'vis',
              query: 'show error rate',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolvePanelContent,
    });

    await Promise.resolve();

    expect(resolvePanelContent).toHaveBeenCalledTimes(2);
    expect(resolvePanelContent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'vis',
        operationType: 'add_section',
        identifier: 'show total requests',
      })
    );
    expect(resolvePanelContent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: 'vis',
        operationType: 'add_section',
        identifier: 'show error rate',
      })
    );

    secondSectionPanel.resolve(
      createResolvedPanelContent({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'bar' },
      })
    );
    firstSectionPanel.resolve(
      createResolvedPanelContent({
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
    const sectionPanel = createDeferred<PanelContentAttempt>();
    const topLevelPanel = createDeferred<PanelContentAttempt>();
    const resolvePanelContent = jest.fn<
      ReturnType<ResolvePanelContent>,
      Parameters<ResolvePanelContent>
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
              source: 'request',
              type: 'vis',
              query: 'show total requests',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
          ],
        },
        {
          operation: 'add_panels',
          panels: [
            {
              source: 'request',
              type: 'vis',
              query: 'show error rate',
              grid: { x: 0, y: 1, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolvePanelContent,
    });

    await Promise.resolve();

    expect(resolvePanelContent).toHaveBeenCalledTimes(2);
    expect(resolvePanelContent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        operationType: 'add_section',
        identifier: 'show total requests',
      })
    );
    expect(resolvePanelContent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        operationType: 'add_panels',
        identifier: 'show error rate',
      })
    );

    topLevelPanel.resolve(
      createResolvedPanelContent({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'bar' },
      })
    );
    sectionPanel.resolve(
      createResolvedPanelContent({
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
                source: 'request',
                type: 'vis',
                query: 'show total requests',
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
            ],
          },
          {
            operation: 'add_panels',
            panels: [
              {
                source: 'request',
                type: 'vis',
                query: 'show error rate',
                grid: { x: 24, y: 0, w: 24, h: 9 },
              },
            ],
          },
        ],
        logger,
      })
    ).rejects.toThrow('Inline panel resolver is required for panel creation operations.');
  });

  it('adds config-source panels into a target section when sectionId is provided', async () => {
    const result = await executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [createSection('section-a', 'Section A', 8)],
      },
      operations: [
        {
          operation: 'add_panels',
          panels: [
            {
              source: 'config',
              type: 'vis',
              config: { type: 'metric' },
              sectionId: 'section-a',
              grid: { x: 12, y: 0, w: 12, h: 5 },
            },
          ],
        },
      ],
      logger,
    });

    const panelsOnly = getPanelsOnly(result.dashboardData.panels);
    const sections = getSections(result.dashboardData.panels);
    expect(panelsOnly).toEqual([]);
    expect(sections[0].panels).toEqual([
      expect.objectContaining({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
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
          operation: 'add_panels',
          panels: [
            {
              source: 'config',
              type: 'markdown',
              config: { content: '### Section Summary' },
              grid: { x: 0, y: 0, w: 24, h: 4 },
              sectionId: 'section-a',
            },
          ],
        },
      ],
      logger,
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

  describe('section refs (client temp keys)', () => {
    it('resolves an add_panels sectionId through a ref declared by add_section in the same call', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        operations: [
          { operation: 'add_section', title: 'Overview', ref: 'overview', grid: { y: 0 } },
          {
            operation: 'add_panels',
            panels: [
              {
                source: 'config',
                type: 'vis',
                config: { type: 'metric' },
                sectionId: 'overview',
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
            ],
          },
        ],
        logger,
      });

      const sections = getSections(result.dashboardData.panels);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(sections).toHaveLength(1);
      expect(sections[0].panels).toEqual([
        expect.objectContaining({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
          grid: { x: 0, y: 0, w: 24, h: 9 },
        }),
      ]);
      expect(result.failures).toEqual([]);
      expect(result.sectionRefs).toEqual(new Map([['overview', sections[0].id]]));
    });

    it('moves a panel into a ref-declared section via update_panel_layouts', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [createLensPanel('top-1')],
        },
        operations: [
          { operation: 'add_section', title: 'Overview', ref: 'overview', grid: { y: 10 } },
          {
            operation: 'update_panel_layouts',
            panels: [{ panelId: 'top-1', sectionId: 'overview' }],
          },
        ],
        logger,
      });

      const sections = getSections(result.dashboardData.panels);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(sections[0].panels).toEqual([expect.objectContaining({ id: 'top-1' })]);
      expect(result.failures).toEqual([]);
    });

    it('records a soft failure when a sectionId matches neither a declared ref nor a section id', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        operations: [
          { operation: 'add_section', title: 'Overview', ref: 'overview', grid: { y: 0 } },
          {
            operation: 'add_panels',
            panels: [
              {
                source: 'config',
                type: 'vis',
                config: { type: 'metric' },
                sectionId: 'unknown-ref',
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
            ],
          },
        ],
        logger,
      });

      // The panel targeting the unknown ref is skipped; the section itself persists.
      expect(getSections(result.dashboardData.panels)).toEqual([
        expect.objectContaining({ title: 'Overview', panels: [] }),
      ]);
      expect(result.failures).toEqual([
        {
          type: DASHBOARD_OPERATION_FAILURE_TYPES.addPanels,
          identifier: 'unknown-ref',
          error: 'Section "unknown-ref" not found. The panel was not added.',
          operationIndex: 1,
        },
      ]);
    });

    it('returns an empty sectionRefs map when no refs are declared', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        operations: [{ operation: 'add_section', title: 'Overview', grid: { y: 0 } }],
        logger,
      });

      expect(result.sectionRefs.size).toBe(0);
    });
  });

  describe('add_panels rows mode', () => {
    it('creates panels with computed grids, appending below existing content', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [createLensPanel('existing-panel')], // grid: { x: 0, y: 0, w: 24, h: 9 }
        },
        operations: [
          {
            operation: 'add_panels',
            rows: [
              [
                { source: 'config', type: 'vis', config: { type: 'metric' } },
                { source: 'config', type: 'vis', config: { type: 'metric' } },
              ],
              [{ source: 'config', type: 'markdown', config: { content: '### Summary' } }],
            ],
          },
        ],
        logger,
      });

      expect(result.failures).toEqual([]);
      expect(result.dashboardData.panels).toEqual([
        expect.objectContaining({ id: 'existing-panel' }),
        expect.objectContaining({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
          grid: { x: 0, y: 9, w: 24, h: 5 },
        }),
        expect.objectContaining({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
          grid: { x: 24, y: 9, w: 24, h: 5 },
        }),
        expect.objectContaining({
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: '### Summary' },
          grid: { x: 0, y: 14, w: 48, h: 6 },
        }),
      ]);
    });

    it('mixes request and config items in one row, sizing the row by its members', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        operations: [
          {
            operation: 'add_panels',
            rows: [
              [
                { source: 'request', type: 'vis', query: 'show total requests' },
                { source: 'config', type: 'markdown', config: { content: '### Notes' } },
              ],
            ],
          },
        ],
        logger,
        resolvePanelContent: createResolvePanelContent({
          'show total requests': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
        }),
      });

      expect(result.failures).toEqual([]);
      // Request item without chartType uses the default height (10) > markdown (6).
      expect(result.dashboardData.panels).toEqual([
        expect.objectContaining({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
          grid: { x: 0, y: 0, w: 24, h: 10 },
        }),
        expect.objectContaining({
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: '### Notes' },
          grid: { x: 24, y: 0, w: 24, h: 10 },
        }),
      ]);
    });

    it('adds rows into an existing section, packing below the section contents', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [createSection('section-a', 'Section A', 0, [createLensPanel('section-a-1', 0)])],
        },
        operations: [
          {
            operation: 'add_panels',
            sectionId: 'section-a',
            rows: [
              [
                { source: 'config', type: 'vis', config: { type: 'metric' } },
                { source: 'config', type: 'vis', config: { type: 'metric' } },
              ],
            ],
          },
        ],
        logger,
      });

      expect(result.failures).toEqual([]);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      // Existing section panel occupies y 0..9 (section-relative), so rows start at y 9.
      expect(getSections(result.dashboardData.panels)[0].panels).toEqual([
        expect.objectContaining({ id: 'section-a-1' }),
        expect.objectContaining({
          config: { type: 'metric' },
          grid: { x: 0, y: 9, w: 24, h: 5 },
        }),
        expect.objectContaining({
          config: { type: 'metric' },
          grid: { x: 24, y: 9, w: 24, h: 5 },
        }),
      ]);
    });

    it('adds rows into a section declared via ref earlier in the same call', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        operations: [
          { operation: 'add_section', title: 'Overview', ref: 'overview', grid: { y: 0 } },
          {
            operation: 'add_panels',
            sectionId: 'overview',
            rows: [[{ source: 'config', type: 'vis', config: { type: 'metric' } }]],
          },
        ],
        logger,
      });

      expect(result.failures).toEqual([]);
      const sections = getSections(result.dashboardData.panels);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(sections[0].panels).toEqual([
        expect.objectContaining({
          config: { type: 'metric' },
          grid: { x: 0, y: 0, w: 48, h: 5 },
        }),
      ]);
      expect(result.sectionRefs).toEqual(new Map([['overview', sections[0].id]]));
    });

    it('records a soft failure and adds nothing when the rows target section is missing', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        operations: [
          {
            operation: 'add_panels',
            sectionId: 'nonexistent-section',
            rows: [[{ source: 'config', type: 'vis', config: { type: 'metric' } }]],
          },
        ],
        logger,
      });

      expect(result.dashboardData.panels).toEqual([]);
      expect(result.failures).toEqual([
        {
          type: DASHBOARD_OPERATION_FAILURE_TYPES.addPanels,
          identifier: 'nonexistent-section',
          error: 'Section "nonexistent-section" not found. The panels were not added.',
          operationIndex: 0,
        },
      ]);
    });

    it('records request failures inside rows as soft failures and keeps the other panels', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        operations: [
          {
            operation: 'add_panels',
            rows: [
              [
                { source: 'request', type: 'vis', query: 'show total requests' },
                { source: 'request', type: 'vis', query: 'show p95 latency' },
              ],
              [{ source: 'config', type: 'markdown', config: { content: '### Summary' } }],
            ],
          },
        ],
        logger,
        resolvePanelContent: createResolvePanelContent({
          'show total requests': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          'show p95 latency': {
            type: 'failure',
            failure: {
              type: 'add_panels',
              identifier: 'show p95 latency',
              error: 'ES|QL generation failed',
            },
          },
        }),
      });

      // The failed item's slot stays empty; surviving panels keep their computed grids.
      expect(result.dashboardData.panels).toEqual([
        expect.objectContaining({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
          grid: { x: 0, y: 0, w: 24, h: 10 },
        }),
        expect.objectContaining({
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: '### Summary' },
          grid: { x: 0, y: 10, w: 48, h: 6 },
        }),
      ]);
      expect(result.failures).toEqual([
        {
          type: 'add_panels',
          identifier: 'show p95 latency',
          error: 'ES|QL generation failed',
          operationIndex: 0,
        },
      ]);
    });

    it('accepts rows and rejects add_panels payloads that break the exactly-one-of rule', () => {
      const rowsOnly = dashboardOperationSchema.safeParse({
        operation: 'add_panels',
        rows: [[{ source: 'config', type: 'markdown', config: { content: 'hi' } }]],
      });
      expect(rowsOnly.success).toBe(true);

      const both = dashboardOperationSchema.safeParse({
        operation: 'add_panels',
        panels: [
          {
            source: 'config',
            type: 'markdown',
            config: { content: 'hi' },
            grid: { x: 0, y: 0, w: 48, h: 5 },
          },
        ],
        rows: [[{ source: 'config', type: 'markdown', config: { content: 'hi' } }]],
      });
      expect(both.success).toBe(false);

      const neither = dashboardOperationSchema.safeParse({ operation: 'add_panels' });
      expect(neither.success).toBe(false);
    });

    it('rejects an operation-level sectionId in panels mode', () => {
      const result = dashboardOperationSchema.safeParse({
        operation: 'add_panels',
        sectionId: 'section-a',
        panels: [
          {
            source: 'config',
            type: 'markdown',
            config: { content: 'hi' },
            grid: { x: 0, y: 0, w: 48, h: 5 },
          },
        ],
      });

      expect(result.success).toBe(false);
    });
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
      });

      expect(result.failures).toEqual([
        {
          type: 'update_panel_layouts',
          identifier: 'missing-panel',
          error: 'Panel "missing-panel" not found.',
          operationIndex: 0,
        },
      ]);
    });

    it('records a failure and does not move the panel when the target section is missing', async () => {
      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [createLensPanel('top-1')],
        },
        operations: [
          { operation: 'set_metadata', title: 'Updated title' },
          {
            operation: 'update_panel_layouts',
            panels: [
              {
                panelId: 'top-1',
                sectionId: 'nonexistent-section',
                grid: { x: 24, y: 0, w: 24, h: 9 },
              },
            ],
          },
        ],
        logger,
      });

      // The panel stays at its original location with its original grid.
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([
        expect.objectContaining({ id: 'top-1', grid: { x: 0, y: 0, w: 24, h: 9 } }),
      ]);
      expect(result.failures).toEqual([
        {
          type: 'update_panel_layouts',
          identifier: 'top-1',
          error: 'Section "nonexistent-section" not found. Panel "top-1" was not moved.',
          operationIndex: 1,
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
            operation: 'add_panels',
            panels: [
              {
                source: 'request',
                type: 'vis',
                query: 'show total requests',
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
              {
                source: 'request',
                type: 'vis',
                query: 'show error rate',
                sectionId: 'section-a',
                grid: { x: 24, y: 0, w: 24, h: 9 },
              },
            ],
          },
        ],
        logger,
        resolvePanelContent: createResolvePanelContent({
          'show total requests': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          'show error rate': createResolvedPanelContent({
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
            operation: 'edit_panels',
            panels: [
              {
                source: 'request',
                type: 'vis',
                panelId: 'panel-1',
                query: 'turn this into a bar chart',
              },
              {
                source: 'request',
                type: 'vis',
                panelId: 'section-panel-1',
                query: 'turn this into a line chart',
              },
            ],
          },
        ],
        logger,
        resolvePanelContent: createResolvePanelContent({
          'panel-1': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'bar' },
          }),
          'section-panel-1': createResolvedPanelContent({
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
            operation: 'edit_panels',
            panels: [
              {
                source: 'request',
                type: 'vis',
                panelId: 'panel-1',
                query: 'make this a bar chart',
              },
            ],
          },
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'request',
                type: 'vis',
                panelId: 'panel-1',
                query: 'now make this a line chart',
              },
            ],
          },
        ],
        logger,
        resolvePanelContent: async (params) => {
          const { nlQuery } = params;
          const config = params.existingPanel?.config as
            | { attributes?: { testStep?: string }; testStep?: string }
            | undefined;
          const configStep = config?.attributes?.testStep ?? config?.testStep ?? 'initial';
          seenConfigSteps.push(configStep);

          if (nlQuery === 'make this a bar chart') {
            return createResolvedPanelContent({
              type: LENS_EMBEDDABLE_TYPE,
              config: { type: 'metric', testStep: 'after-first-edit' },
            });
          }

          return createResolvedPanelContent({
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
      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >(async () =>
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'bar' } })
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
            operation: 'edit_panels',
            panels: [
              {
                source: 'request',
                type: 'vis',
                panelId: 'panel-1',
                query: 'make this a bar chart',
              },
            ],
          },
        ],
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(result.failures).toEqual([
        {
          type: DASHBOARD_OPERATION_FAILURE_TYPES.editPanels,
          identifier: 'panel-1',
          error: 'Panel "panel-1" not found.',
          operationIndex: 1,
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
            operation: 'add_panels',
            panels: [
              {
                source: 'request',
                type: 'vis',
                query: 'show total requests',
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
              {
                source: 'request',
                type: 'vis',
                query: 'show p95 latency',
                grid: { x: 24, y: 0, w: 24, h: 9 },
              },
            ],
          },
        ],
        logger,
        resolvePanelContent: createResolvePanelContent({
          'show total requests': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          'show p95 latency': {
            type: 'failure',
            failure: {
              type: 'add_panels',
              identifier: 'show p95 latency',
              error: 'ES|QL generation failed',
            },
          },
        }),
      });

      expect(getPanelsOnly(result.dashboardData.panels)).toHaveLength(1);
      expect(result.failures).toEqual([
        {
          type: 'add_panels',
          identifier: 'show p95 latency',
          error: 'ES|QL generation failed',
          operationIndex: 0,
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
            operation: 'edit_panels',
            panels: [
              { source: 'request', type: 'vis', panelId: 'panel-1', query: 'refine this analysis' },
            ],
          },
        ],
        logger,
        resolvePanelContent: createResolvePanelContent({
          'panel-1': {
            type: 'failure',
            failure: {
              type: DASHBOARD_OPERATION_FAILURE_TYPES.editPanels,
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
          type: DASHBOARD_OPERATION_FAILURE_TYPES.editPanels,
          identifier: 'panel-1',
          error:
            'Panel "panel-1" with type "aiOpsLogRateAnalysis" is not supported for inline visualization editing.',
          operationIndex: 0,
        },
      ]);
    });

    it('resolves multiple panel edits in one edit_panels op in parallel', async () => {
      const deferredByPanelId = new Map<
        string,
        ReturnType<typeof createDeferred<PanelContentAttempt>>
      >([
        ['panel-1', createDeferred<PanelContentAttempt>()],
        ['panel-2', createDeferred<PanelContentAttempt>()],
      ]);

      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >(({ identifier }) => {
        const deferred = deferredByPanelId.get(identifier);
        if (!deferred) {
          throw new Error(`Unexpected identifier "${identifier}" in test resolver`);
        }
        return deferred.promise;
      });

      const operationPromise = executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createLensPanel('panel-1', 0), createLensPanel('panel-2', 9)],
        },
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'request',
                type: 'vis',
                panelId: 'panel-1',
                query: 'make this a bar chart',
              },
              {
                source: 'request',
                type: 'vis',
                panelId: 'panel-2',
                query: 'make this a line chart',
              },
            ],
          },
        ],
        logger,
        resolvePanelContent,
      });

      // Gives the operation a chance to start both parallel resolver calls.
      await waitForNextEventLoopTurn();

      expect(resolvePanelContent).toHaveBeenCalledTimes(2);

      deferredByPanelId
        .get('panel-1')!
        .resolve(
          createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'bar' } })
        );
      deferredByPanelId
        .get('panel-2')!
        .resolve(
          createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'line' } })
        );

      const result = await operationPromise;

      const topLevelPanels = getPanelsOnly(result.dashboardData.panels);
      expect(topLevelPanels[0]).toEqual(
        expect.objectContaining({ id: 'panel-1', config: { type: 'bar' } })
      );
      expect(topLevelPanels[1]).toEqual(
        expect.objectContaining({ id: 'panel-2', config: { type: 'line' } })
      );
      expect(result.failures).toEqual([]);
    });

    it('records a failure for each occurrence when a panelId is duplicated within one op', async () => {
      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >(async ({ identifier }) =>
        createResolvedPanelContent({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'bar', identifier },
        })
      );

      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createLensPanel('panel-1', 0), createLensPanel('panel-2', 9)],
        },
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              { source: 'request', type: 'vis', panelId: 'panel-1', query: 'first edit' },
              {
                source: 'request',
                type: 'vis',
                panelId: 'panel-2',
                query: 'edit a different panel',
              },
              {
                source: 'request',
                type: 'vis',
                panelId: 'panel-1',
                query: 'second edit of same panel',
              },
            ],
          },
        ],
        logger,
        resolvePanelContent,
      });

      const duplicateError =
        'Panel "panel-1" appears multiple times in this edit_panels operation. Edit each panel at most once per operation.';

      expect(result.failures).toEqual([
        {
          type: DASHBOARD_OPERATION_FAILURE_TYPES.editPanels,
          identifier: 'panel-1',
          error: duplicateError,
          operationIndex: 0,
        },
        {
          type: DASHBOARD_OPERATION_FAILURE_TYPES.editPanels,
          identifier: 'panel-1',
          error: duplicateError,
          operationIndex: 0,
        },
      ]);

      // The duplicated panel must not be touched; the non-duplicated panel still resolves.
      expect(resolvePanelContent).toHaveBeenCalledTimes(1);
      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'panel-2' })
      );

      const topLevelPanels = getPanelsOnly(result.dashboardData.panels);
      expect(topLevelPanels[0]).toEqual(
        expect.objectContaining({ id: 'panel-1', config: { type: 'metric' } })
      );
      expect(topLevelPanels[1]).toEqual(
        expect.objectContaining({
          id: 'panel-2',
          config: { type: 'bar', identifier: 'panel-2' },
        })
      );
    });

    it('edits a markdown panel content in place by panelId', async () => {
      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >();

      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createMarkdownPanel('md-1', 'old text')],
        },
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'config',
                type: 'markdown',
                panelId: 'md-1',
                config: { content: '### Updated summary' },
              },
            ],
          },
        ],
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(result.failures).toEqual([]);

      const topLevelPanels = getPanelsOnly(result.dashboardData.panels);
      expect(topLevelPanels[0]).toEqual(
        expect.objectContaining({
          id: 'md-1',
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: '### Updated summary' },
          grid: { x: 0, y: 0, w: 48, h: 5 },
        })
      );
    });

    it('records a failure when a markdown config-source edit targets a non-markdown panel', async () => {
      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >();

      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createLensPanel('panel-1', 0)],
        },
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'config',
                type: 'markdown',
                panelId: 'panel-1',
                config: { content: 'new text' },
              },
            ],
          },
        ],
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(result.failures).toEqual([
        {
          type: DASHBOARD_OPERATION_FAILURE_TYPES.editPanels,
          identifier: 'panel-1',
          error: `Panel "panel-1" with type "${LENS_EMBEDDABLE_TYPE}" cannot be edited as markdown. Use source: "request" for ES|QL-backed Lens panels.`,
          operationIndex: 0,
        },
      ]);

      // Lens panel must be left untouched
      expect(getPanelsOnly(result.dashboardData.panels)[0]).toEqual(
        expect.objectContaining({
          id: 'panel-1',
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
        })
      );
    });

    it('mixes markdown and visualization edits in one op, parallelizing only the visualization resolves', async () => {
      const deferred = createDeferred<PanelContentAttempt>();
      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >(() => deferred.promise);

      const operationPromise = executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createMarkdownPanel('md-1', 'old text'), createLensPanel('panel-1', 5)],
        },
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'config',
                type: 'markdown',
                panelId: 'md-1',
                config: { content: '### New summary' },
              },
              {
                source: 'request',
                type: 'vis',
                panelId: 'panel-1',
                query: 'turn into a bar chart',
              },
            ],
          },
        ],
        logger,
        resolvePanelContent,
      });

      // Gives the operation a chance to subscribe to the visualization resolve.
      await waitForNextEventLoopTurn();

      expect(resolvePanelContent).toHaveBeenCalledTimes(1);
      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'panel-1' })
      );

      deferred.resolve(
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'bar' } })
      );

      const result = await operationPromise;
      expect(result.failures).toEqual([]);

      const topLevelPanels = getPanelsOnly(result.dashboardData.panels);
      expect(topLevelPanels[0]).toEqual(
        expect.objectContaining({
          id: 'md-1',
          config: { content: '### New summary' },
        })
      );
      expect(topLevelPanels[1]).toEqual(
        expect.objectContaining({ id: 'panel-1', config: { type: 'bar' } })
      );
    });
  });

  describe('resolvable panel type additivity', () => {
    const FAKE_EMBEDDABLE_TYPE = 'fakeEmbeddable';

    interface FakePanelResolutionSourceInput extends PanelResolutionSourceInput {
      type: 'fake';
      /** The fake type's own request payload; unknown to the vis request shape. */
      fakeQuery: string;
      /** Present on edit inputs. */
      panelId?: string;
    }

    interface FakePanelResolutionRequest extends PanelResolutionRequestBase {
      type: 'fake';
      fakeQuery: string;
    }

    /**
     * A second resolvable panel type registered exactly the way a real one would
     * be: its module-level definition owns its resolution-request shape. The
     * model-facing schemas are intentionally untouched (vis stays the only
     * request-source type the LLM sees), so operations are cast below.
     */
    const fakePanelDefinition = definePanelType<FakePanelResolutionSourceInput>({
      embeddableType: FAKE_EMBEDDABLE_TYPE,
      buildResolutionRequest: ({
        input,
        operationType,
        existingPanel,
      }): FakePanelResolutionRequest => ({
        type: 'fake',
        operationType,
        identifier: input.panelId ?? input.fakeQuery,
        fakeQuery: input.fakeQuery,
        existingPanel,
      }),
    });

    const registry = PANEL_TYPE_DEFINITIONS as Record<string, PanelTypeDefinition>;

    beforeAll(() => {
      registry.fake = fakePanelDefinition;
    });

    afterAll(() => {
      delete registry.fake;
    });

    const createFakeAwareResolver = () =>
      jest.fn(
        async (
          request: PanelResolutionRequest | FakePanelResolutionRequest
        ): Promise<PanelContentAttempt> => {
          if (request.type === 'fake') {
            return {
              type: 'success',
              panelContent: {
                type: FAKE_EMBEDDABLE_TYPE,
                config: { fakeQuery: request.fakeQuery },
              },
            };
          }

          return createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          });
        }
      );

    it('collects, resolves, and materializes fake-type panel creations with no operation-handler changes', async () => {
      const resolvePanelContent = createFakeAwareResolver();

      const operations = [
        {
          operation: 'add_section',
          title: 'Fakes',
          grid: { y: 0 },
          panels: [
            {
              source: 'request',
              type: 'fake',
              fakeQuery: 'render the section fake widget',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
          ],
        },
        {
          operation: 'add_panels',
          panels: [
            {
              source: 'request',
              type: 'fake',
              fakeQuery: 'render the fake widget',
              grid: { x: 0, y: 9, w: 24, h: 9 },
            },
            {
              source: 'request',
              type: 'vis',
              query: 'show total requests',
              grid: { x: 24, y: 9, w: 24, h: 9 },
            },
          ],
        },
      ] as unknown as DashboardOperation[];

      const result = await executeDashboardOperations({
        dashboardData: { title: 'Test', description: 'Desc', panels: [] },
        operations,
        logger,
        resolvePanelContent,
      });

      // Each type's registered builder shaped its own request.
      expect(resolvePanelContent).toHaveBeenCalledWith({
        type: 'fake',
        operationType: 'add_section',
        identifier: 'render the section fake widget',
        fakeQuery: 'render the section fake widget',
        existingPanel: undefined,
      });
      expect(resolvePanelContent).toHaveBeenCalledWith({
        type: 'fake',
        operationType: 'add_panels',
        identifier: 'render the fake widget',
        fakeQuery: 'render the fake widget',
        existingPanel: undefined,
      });
      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'vis',
          operationType: 'add_panels',
          identifier: 'show total requests',
          nlQuery: 'show total requests',
        })
      );

      expect(getSections(result.dashboardData.panels)[0].panels).toEqual([
        expect.objectContaining({
          type: FAKE_EMBEDDABLE_TYPE,
          config: { fakeQuery: 'render the section fake widget' },
          grid: { x: 0, y: 0, w: 24, h: 9 },
        }),
      ]);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([
        expect.objectContaining({
          type: FAKE_EMBEDDABLE_TYPE,
          config: { fakeQuery: 'render the fake widget' },
          grid: { x: 0, y: 9, w: 24, h: 9 },
        }),
        expect.objectContaining({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
          grid: { x: 24, y: 9, w: 24, h: 9 },
        }),
      ]);
      expect(result.failures).toEqual([]);
    });

    it('edits an existing fake-type panel through the registered request builder', async () => {
      const resolvePanelContent = createFakeAwareResolver();

      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [
            {
              id: 'fake-1',
              type: FAKE_EMBEDDABLE_TYPE,
              config: { fakeQuery: 'old fake widget' },
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
          ],
        },
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'request',
                type: 'fake',
                panelId: 'fake-1',
                fakeQuery: 'make it fancier',
              },
            ],
          },
        ] as unknown as DashboardOperation[],
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).toHaveBeenCalledWith({
        type: 'fake',
        operationType: 'edit_panels',
        identifier: 'fake-1',
        fakeQuery: 'make it fancier',
        existingPanel: expect.objectContaining({ id: 'fake-1' }),
      });
      expect(getPanelsOnly(result.dashboardData.panels)[0]).toEqual(
        expect.objectContaining({
          id: 'fake-1',
          type: FAKE_EMBEDDABLE_TYPE,
          config: { fakeQuery: 'make it fancier' },
          grid: { x: 0, y: 0, w: 24, h: 9 },
        })
      );
      expect(result.failures).toEqual([]);
    });
  });

  it('records a failure and skips the panel when an add_panels item references an invalid sectionId', async () => {
    const result = await executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [],
      },
      operations: [
        {
          operation: 'add_panels',
          panels: [
            {
              source: 'config',
              type: 'markdown',
              config: { content: '### Summary' },
              grid: { x: 0, y: 0, w: 48, h: 5 },
              sectionId: 'nonexistent-section',
            },
            {
              source: 'config',
              type: 'vis',
              config: { type: 'metric' },
              grid: { x: 0, y: 5, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
    });

    // The bad-target panel is skipped; the valid panel is still added.
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
        grid: { x: 0, y: 5, w: 24, h: 9 },
      }),
    ]);
    expect(result.failures).toEqual([
      {
        type: DASHBOARD_OPERATION_FAILURE_TYPES.addPanels,
        identifier: 'nonexistent-section',
        error: 'Section "nonexistent-section" not found. The panel was not added.',
        operationIndex: 0,
      },
    ]);
  });

  it('records a failure when a resolved request-source panel targets an invalid sectionId', async () => {
    const result = await executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [],
      },
      operations: [
        { operation: 'set_metadata', title: 'Updated title' },
        {
          operation: 'add_panels',
          panels: [
            {
              source: 'request',
              type: 'vis',
              query: 'show total requests',
              sectionId: 'nonexistent-section',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolvePanelContent: createResolvePanelContent(),
    });

    expect(result.dashboardData.panels).toEqual([]);
    expect(result.failures).toEqual([
      {
        type: DASHBOARD_OPERATION_FAILURE_TYPES.addPanels,
        identifier: 'nonexistent-section',
        error: 'Section "nonexistent-section" not found. The panel was not added.',
        operationIndex: 1,
      },
    ]);
  });

  it('records a failure and leaves the dashboard unchanged when remove_section targets an unknown id', async () => {
    const result = await executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [
          createLensPanel('top-1'),
          createSection('section-a', 'Section A', 10, [createLensPanel('section-a-1', 0)]),
        ],
      },
      operations: [
        { operation: 'remove_section', id: 'nonexistent-section', panelAction: 'delete' },
      ],
      logger,
    });

    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({ id: 'top-1' }),
      expect.objectContaining({
        id: 'section-a',
        panels: [expect.objectContaining({ id: 'section-a-1' })],
      }),
    ]);
    expect(result.failures).toEqual([
      {
        type: DASHBOARD_OPERATION_FAILURE_TYPES.removeSection,
        identifier: 'nonexistent-section',
        error: 'Section "nonexistent-section" not found.',
        operationIndex: 0,
      },
    ]);
  });

  it('records one failure per unmatched remove_panels id while removing matched ids', async () => {
    const result = await executeDashboardOperations({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [createLensPanel('top-1'), createLensPanel('top-2', 9)],
      },
      operations: [
        { operation: 'set_metadata', title: 'Updated title' },
        { operation: 'remove_panels', panelIds: ['top-1', 'missing-1', 'missing-2'] },
      ],
      logger,
    });

    expect(result.dashboardData.panels).toEqual([expect.objectContaining({ id: 'top-2' })]);
    expect(result.failures).toEqual([
      {
        type: DASHBOARD_OPERATION_FAILURE_TYPES.removePanels,
        identifier: 'missing-1',
        error: 'Panel "missing-1" not found.',
        operationIndex: 1,
      },
      {
        type: DASHBOARD_OPERATION_FAILURE_TYPES.removePanels,
        identifier: 'missing-2',
        error: 'Panel "missing-2" not found.',
        operationIndex: 1,
      },
    ]);
  });

  it('accepts a markdown config-source panel with content and optional settings', () => {
    const result = dashboardOperationSchema.safeParse({
      operation: 'add_panels',
      panels: [
        {
          source: 'config',
          type: 'markdown',
          config: { content: '## Hi', settings: { open_links_in_new_tab: true } },
          grid: { x: 0, y: 0, w: 48, h: 5 },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects a markdown config-source panel whose config is missing content', () => {
    const result = dashboardOperationSchema.safeParse({
      operation: 'add_panels',
      panels: [
        {
          source: 'config',
          type: 'markdown',
          config: { settings: { open_links_in_new_tab: false } },
          grid: { x: 0, y: 0, w: 48, h: 5 },
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('accepts a vis config-source panel whose config is a Lens API config', () => {
    const result = dashboardOperationSchema.safeParse({
      operation: 'add_panels',
      panels: [
        {
          source: 'config',
          type: 'vis',
          config: { type: 'metric', title: 'Total requests' },
          grid: { x: 0, y: 0, w: 24, h: 9 },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects a vis config-source panel whose config is the whole visualization attachment', () => {
    const result = dashboardOperationSchema.safeParse({
      operation: 'add_panels',
      panels: [
        {
          source: 'config',
          type: 'vis',
          config: {
            query: 'count of requests',
            visualization: { type: 'metric', title: 'Total requests' },
            chart_type: 'metric',
            esql: 'FROM logs | STATS count = COUNT(*)',
          },
          grid: { x: 0, y: 0, w: 24, h: 9 },
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects a vis config-source panel whose config is not a Lens API config', () => {
    const result = dashboardOperationSchema.safeParse({
      operation: 'add_panels',
      panels: [
        {
          source: 'config',
          type: 'vis',
          config: { title: 'Total requests' },
          grid: { x: 0, y: 0, w: 24, h: 9 },
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
