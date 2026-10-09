/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
  DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import type { PanelContentAttempt } from './resolve_panel';
import type { ResolvePanelContent } from './operations/panels';
import {
  executeDashboardOperations,
  dashboardOperationSchema,
  type DashboardOperation,
} from './operations';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from './failure_types';
import type { ControlFieldCapability, ResolveControlFieldCapabilities } from './operations/types';
import type { ValidateDashboard } from './validate_dashboard';

const usable = (type: string): ControlFieldCapability => ({ status: 'usable', type });
const NOT_AGGREGATABLE: ControlFieldCapability = { status: 'not_aggregatable' };
const CONFLICTING: ControlFieldCapability = { status: 'conflicting' };

const createFieldCapabilitiesResolver = (
  fields: Readonly<Record<string, ControlFieldCapability>>
) =>
  jest.fn<ReturnType<ResolveControlFieldCapabilities>, Parameters<ResolveControlFieldCapabilities>>(
    async () => new Map(Object.entries(fields))
  );

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

  const createAnomalyChartsPanel = (
    id: string,
    jobIds: string[] = ['job-1'],
    grid: AttachmentPanel['grid'] = { x: 0, y: 0, w: 24, h: 15 }
  ): AttachmentPanel => ({
    id,
    type: 'ml_anomaly_charts',
    config: { job_ids: jobIds },
    grid,
  });

  const createAnomalySwimlanePanel = (
    id: string,
    jobIds: string[] = ['job-1'],
    grid: AttachmentPanel['grid'] = { x: 0, y: 0, w: 48, h: 12 }
  ): AttachmentPanel => ({
    id,
    type: 'ml_anomaly_swimlane',
    config: { job_ids: jobIds, swimlane_type: 'overall' },
    grid,
  });

  const createSingleMetricViewerPanel = (
    id: string,
    jobIds: string[] = ['job-1'],
    grid: AttachmentPanel['grid'] = { x: 0, y: 0, w: 24, h: 15 }
  ): AttachmentPanel => ({
    id,
    type: 'ml_single_metric_viewer',
    config: { job_ids: jobIds },
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
    panelContent: Pick<AttachmentPanel, 'type' | 'config'>,
    authoringNote = 'Created a visualization using the requested data.'
  ): PanelContentAttempt => ({
    type: 'success',
    panelContent,
    authoringNote,
  });

  const resolveMetricAttachment = (): PanelContentAttempt => ({
    type: 'success',
    panelContent: { type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric' } },
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
            source: 'attachment',
            attachment_id: 'metric-vis',
            grid: { x: 0, y: 0, w: 24, h: 9 },
          },
          {
            source: 'config',
            type: 'markdown',
            config: { content: '### Updated summary', settings: { open_links_in_new_tab: true } },
            grid: { x: 0, y: 9, w: 48, h: 5 },
          },
        ],
      },
    ];

    const result = await executeDashboardOperations({
      dashboardData: baseDashboardData,
      operations,
      logger,
      resolveAttachmentPanel: resolveMetricAttachment,
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

  it('adds attachment-source panels successfully', async () => {
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
              source: 'attachment',
              attachment_id: 'metric-vis',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
            {
              source: 'attachment',
              attachment_id: 'metric-vis',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
        {
          operation: 'add_panels',
          panels: [
            {
              source: 'attachment',
              attachment_id: 'metric-vis',
              grid: { x: 0, y: 9, w: 12, h: 5 },
            },
          ],
        },
      ],
      logger,
      resolveAttachmentPanel: resolveMetricAttachment,
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
              config: { content: '### Summary', settings: { open_links_in_new_tab: true } },
              grid: { x: 0, y: 0, w: 24, h: 4 },
            },
            {
              source: 'attachment',
              attachment_id: 'metric-vis',
              sectionId: 'section-a',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
            {
              source: 'request',
              chartType: SupportedChartType.Metric,
              query: 'show total requests',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
            {
              source: 'attachment',
              attachment_id: 'metric-vis',
              grid: { x: 0, y: 9, w: 24, h: 9 },
            },
            {
              source: 'request',
              chartType: SupportedChartType.Metric,
              query: 'show p95 latency',
              sectionId: 'section-a',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolveAttachmentPanel: resolveMetricAttachment,
      resolvePanelContent: createResolvePanelContent({
        'show total requests': createResolvedPanelContent(
          {
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          },
          'Created a titleless metric showing total requests.'
        ),
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
        config: { content: '### Summary', settings: { open_links_in_new_tab: true } },
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
      },
    ]);
    const generatedPanel = getPanelsOnly(result.dashboardData.panels).find(
      (panel) => panel.grid.x === 24 && panel.grid.y === 0
    );
    expect(result.panelAuthoringNotes).toEqual([
      {
        panelId: generatedPanel?.id,
        authoringNote: 'Created a titleless metric showing total requests.',
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
              source: 'attachment',
              attachment_id: 'metric-vis',
              grid: { x: 0, y: 0, w: 12, h: 5 },
            },
          ],
        },
      ],
      logger,
      resolveAttachmentPanel: resolveMetricAttachment,
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

  describe('validateDashboard', () => {
    const validateDashboard: ValidateDashboard = ({ panels }) =>
      panels.flatMap((widget, widgetIndex) =>
        !isSection(widget) && 'unrecognizedKey' in widget.config
          ? [
              {
                path: ['panels', widgetIndex, 'config', 'unrecognizedKey'],
                message: 'Unrecognized key',
              },
            ]
          : []
      );

    it('discards invalid panels after all operations and drops their authoring notes', async () => {
      const result = await executeDashboardOperations({
        dashboardData: { title: 'Dashboard', panels: [] },
        operations: [
          {
            operation: 'add_panels',
            panels: [
              {
                source: 'request',
                chartType: SupportedChartType.Metric,
                query: 'show total requests',
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
              {
                source: 'request',
                chartType: SupportedChartType.Metric,
                query: 'show p95 latency',
                grid: { x: 24, y: 0, w: 24, h: 9 },
              },
            ],
          },
        ],
        logger,
        resolvePanelContent: createResolvePanelContent({
          'show total requests': createResolvedPanelContent(
            { type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric' } },
            'Created a metric showing total requests.'
          ),
          'show p95 latency': createResolvedPanelContent(
            { type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric', unrecognizedKey: true } },
            'Created a metric showing p95 latency.'
          ),
        }),
        validateDashboard,
      });

      const [validPanel, ...otherPanels] = getPanelsOnly(result.dashboardData.panels);
      expect(validPanel.config).toEqual({ type: 'metric' });
      expect(otherPanels).toEqual([]);
      expect(result.failures).toEqual([
        expect.objectContaining({
          type: DASHBOARD_OPERATION_FAILURE_TYPES.validateDashboard,
          error: expect.stringContaining('Panel was not added'),
        }),
      ]);
      expect(result.panelAuthoringNotes).toEqual([
        { panelId: validPanel.id, authoringNote: 'Created a metric showing total requests.' },
      ]);
    });

    it('validates what finalizeDashboard adds', async () => {
      const result = await executeDashboardOperations({
        dashboardData: { title: 'Dashboard', panels: [] },
        operations: [{ operation: 'set_metadata', title: 'Renamed' }],
        logger,
        finalizeDashboard: async (dashboardData) => ({
          ...dashboardData,
          time_range: { from: 'invalid', to: 'now' },
        }),
        validateDashboard: ({ time_range: timeRange }) =>
          timeRange?.from === 'invalid'
            ? [{ path: ['time_range', 'from'], message: 'Invalid' }]
            : [],
      });

      expect(result.dashboardData).toEqual({ title: 'Renamed', panels: [] });
      expect(result.failures).toEqual([
        expect.objectContaining({
          type: DASHBOARD_OPERATION_FAILURE_TYPES.validateDashboard,
          identifier: 'time_range',
        }),
      ]);
    });
  });

  describe('call-local section keys', () => {
    it('moves existing panels and adds resolved panels into newly keyed sections', async () => {
      const topPanel = createLensPanel('top-panel');
      const nestedPanel = createLensPanel('nested-panel');
      const dashboardData: DashboardAttachmentData = {
        title: 'Test dashboard',
        panels: [topPanel, createSection('existing-section', 'Existing', 0, [nestedPanel])],
      };
      const operations: DashboardOperation[] = [
        { operation: 'add_section', key: 'overview', title: 'Metrics', grid: { y: 10 } },
        { operation: 'add_section', key: 'details', title: 'Metrics', grid: { y: 20 } },
        {
          operation: 'update_panel_layouts',
          panels: [
            { panelId: topPanel.id, sectionId: 'overview' },
            {
              panelId: nestedPanel.id,
              sectionId: 'details',
              grid: { x: 0, y: 2, w: 48, h: 8 },
            },
          ],
        },
        {
          operation: 'add_panels',
          panels: [
            {
              source: 'config',
              type: 'markdown',
              config: { content: 'Summary', settings: { open_links_in_new_tab: true } },
              sectionId: 'overview',
              grid: { x: 0, y: 9, w: 48, h: 5 },
            },
            {
              source: 'request',
              chartType: SupportedChartType.Metric,
              query: 'show total requests',
              sectionId: 'details',
              grid: { x: 0, y: 10, w: 24, h: 9 },
            },
          ],
        },
      ];
      const originalInputs = structuredClone({ dashboardData, operations });

      const result = await executeDashboardOperations({
        dashboardData,
        operations,
        logger,
        resolvePanelContent: createResolvePanelContent(),
      });

      const [existing, overview, details] = getSections(result.dashboardData.panels);
      expect(existing.panels).toEqual([]);
      expect(overview.panels).toEqual([
        topPanel,
        expect.objectContaining({
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: 'Summary', settings: { open_links_in_new_tab: true } },
        }),
      ]);
      expect(details.panels).toEqual([
        { ...nestedPanel, grid: { x: 0, y: 2, w: 48, h: 8 } },
        expect.objectContaining({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric' } }),
      ]);
      expect(overview.id).not.toBe('overview');
      expect(details.id).not.toBe('details');
      expect(overview.id).not.toBe(details.id);
      expect(overview).not.toHaveProperty('key');
      expect(details).not.toHaveProperty('key');
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(result.failures).toEqual([]);
      expect({ dashboardData, operations }).toEqual(originalInputs);
    });

    it('resolves a key for removal and retains the moved panel when promoting', async () => {
      const panel = createLensPanel('panel');
      const result = await executeDashboardOperations({
        dashboardData: { title: 'Test', panels: [panel] },
        operations: [
          { operation: 'add_section', key: 'overview', title: 'Overview', grid: { y: 0 } },
          {
            operation: 'update_panel_layouts',
            panels: [{ panelId: panel.id, sectionId: 'overview' }],
          },
          { operation: 'remove_section', id: 'overview', panelAction: 'promote' },
        ],
        logger,
      });

      expect(result.dashboardData.panels).toEqual([panel]);
    });

    it.each([false, true])('rejects duplicate keys (first section removed: %s)', async (remove) => {
      const operations: DashboardOperation[] = [
        { operation: 'add_section', key: 'overview', title: 'Overview', grid: { y: 0 } },
      ];
      if (remove) {
        operations.push({ operation: 'remove_section', id: 'overview', panelAction: 'promote' });
      }
      operations.push({
        operation: 'add_section',
        key: 'overview',
        title: 'Another section',
        grid: { y: 10 },
      });

      await expect(executeDashboardOperations({ operations, logger })).rejects.toThrow(
        'Section key "overview" is already used in this call.'
      );
    });

    it('rejects a key that would shadow an existing section id', async () => {
      await expect(
        executeDashboardOperations({
          dashboardData: { title: 'Test', panels: [createSection('overview', 'Existing', 0)] },
          operations: [
            { operation: 'add_section', key: 'overview', title: 'New', grid: { y: 10 } },
          ],
          logger,
        })
      ).rejects.toThrow('Section key "overview" conflicts with an existing section id.');
    });

    it.each([false, true])(
      'rejects unknown keys without changing the original panel (section created later: %s)',
      async (createLater) => {
        const panel = createLensPanel('panel');
        const dashboardData: DashboardAttachmentData = { title: 'Test', panels: [panel] };
        const operations: DashboardOperation[] = [
          {
            operation: 'update_panel_layouts',
            panels: [{ panelId: panel.id, sectionId: 'overview' }],
          },
        ];
        if (createLater) {
          operations.push({
            operation: 'add_section',
            key: 'overview',
            title: 'Overview',
            grid: { y: 0 },
          });
        }

        await expect(
          executeDashboardOperations({ dashboardData, operations, logger })
        ).rejects.toThrow('Section "overview" not found.');
        expect(dashboardData.panels).toEqual([panel]);
      }
    );

    it('requires the generated id instead of the key in a subsequent call', async () => {
      const panel = createLensPanel('panel');
      const created = await executeDashboardOperations({
        dashboardData: { title: 'Test', panels: [panel] },
        operations: [
          { operation: 'add_section', key: 'overview', title: 'Overview', grid: { y: 0 } },
        ],
        logger,
      });

      await expect(
        executeDashboardOperations({
          dashboardData: created.dashboardData,
          operations: [
            {
              operation: 'update_panel_layouts',
              panels: [{ panelId: panel.id, sectionId: 'overview' }],
            },
          ],
          logger,
        })
      ).rejects.toThrow('Section "overview" not found.');

      const [section] = getSections(created.dashboardData.panels);
      const moved = await executeDashboardOperations({
        dashboardData: created.dashboardData,
        operations: [
          {
            operation: 'update_panel_layouts',
            panels: [{ panelId: panel.id, sectionId: section.id }],
          },
        ],
        logger,
      });
      expect(getSections(moved.dashboardData.panels)[0].panels).toEqual([panel]);
    });

    it.each(['', 'a'.repeat(257)])('rejects an empty or oversized key', (key) => {
      expect(
        dashboardOperationSchema.safeParse({
          operation: 'add_section',
          key,
          title: 'Overview',
          grid: { y: 0 },
        }).success
      ).toBe(false);
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
              chartType: SupportedChartType.Metric,
              query: 'show total requests',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
            {
              source: 'request',
              chartType: SupportedChartType.Metric,
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
              chartType: SupportedChartType.Metric,
              query: 'show total requests',
              grid: { x: 0, y: 0, w: 24, h: 9 },
            },
            {
              source: 'request',
              chartType: SupportedChartType.Metric,
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
              config: { content: '### Section Summary', settings: { open_links_in_new_tab: true } },
              grid: { x: 0, y: 0, w: 24, h: 4 },
            },
            {
              source: 'attachment',
              attachment_id: 'metric-vis',
              grid: { x: 24, y: 0, w: 24, h: 9 },
            },
          ],
        },
      ],
      logger,
      resolveAttachmentPanel: resolveMetricAttachment,
      resolvePanelContent,
    });

    expect(resolvePanelContent).not.toHaveBeenCalled();
    expect(getSections(result.dashboardData.panels)[0].panels).toEqual([
      expect.objectContaining({
        type: MARKDOWN_EMBEDDABLE_TYPE,
        config: { content: '### Section Summary', settings: { open_links_in_new_tab: true } },
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
              chartType: SupportedChartType.Metric,
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
              chartType: SupportedChartType.Metric,
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
        operationType: 'add_section',
        identifier: 'show total requests',
      })
    );
    expect(resolvePanelContent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
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
              chartType: SupportedChartType.Metric,
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
              chartType: SupportedChartType.Metric,
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
                chartType: SupportedChartType.Metric,
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
                chartType: SupportedChartType.Metric,
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

  it('adds attachment-source panels into a target section when sectionId is provided', async () => {
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
              source: 'attachment',
              attachment_id: 'metric-vis',
              sectionId: 'section-a',
              grid: { x: 12, y: 0, w: 12, h: 5 },
            },
          ],
        },
      ],
      logger,
      resolveAttachmentPanel: resolveMetricAttachment,
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
              config: { content: '### Section Summary', settings: { open_links_in_new_tab: true } },
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
        config: { content: '### Section Summary', settings: { open_links_in_new_tab: true } },
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
                chartType: SupportedChartType.Metric,
                query: 'show total requests',
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
              {
                source: 'request',
                chartType: SupportedChartType.Metric,
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
                panelId: 'panel-1',
                query: 'turn this into a bar chart',
              },
              {
                source: 'request',
                panelId: 'section-panel-1',
                query: 'turn this into a line chart',
              },
            ],
          },
        ],
        logger,
        resolvePanelContent: createResolvePanelContent({
          'panel-1': createResolvedPanelContent(
            {
              type: LENS_EMBEDDABLE_TYPE,
              config: { type: 'bar' },
            },
            'Changed the panel to a bar chart and retained its title.'
          ),
          'section-panel-1': createResolvedPanelContent(
            {
              type: LENS_EMBEDDABLE_TYPE,
              config: { type: 'line' },
            },
            'Changed the panel to a line chart with the legend below.'
          ),
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
      expect(result.panelAuthoringNotes).toEqual([
        {
          panelId: 'panel-1',
          authoringNote: 'Changed the panel to a bar chart and retained its title.',
        },
        {
          panelId: 'section-panel-1',
          authoringNote: 'Changed the panel to a line chart with the legend below.',
        },
      ]);
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
                chartType: SupportedChartType.Metric,
                query: 'show total requests',
                grid: { x: 0, y: 0, w: 24, h: 9 },
              },
              {
                source: 'request',
                chartType: SupportedChartType.Metric,
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
        },
      ]);
    });

    it('records a failure without calling the resolver when a request edit targets a panel with no renderer', async () => {
      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >();

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
            panels: [{ source: 'request', panelId: 'panel-1', query: 'refine this analysis' }],
          },
        ],
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([
        expect.objectContaining({ id: 'panel-1', config: { seriesType: 'log_rate' } }),
      ]);
      expect(result.failures).toEqual([
        {
          type: DASHBOARD_OPERATION_FAILURE_TYPES.editPanels,
          identifier: 'panel-1',
          error:
            'Panel "panel-1" with type "aiOpsLogRateAnalysis" is not supported for inline editing.',
        },
      ]);
    });

    describe('request edit renderer', () => {
      const editWith = async (
        existingPanel: AttachmentPanel,
        panelInput: Record<string, unknown>
      ) => {
        const resolvePanelContent = jest.fn<
          ReturnType<ResolvePanelContent>,
          Parameters<ResolvePanelContent>
        >(async () =>
          createResolvedPanelContent({ type: existingPanel.type, config: { updated: true } })
        );
        const result = await executeDashboardOperations({
          dashboardData: { title: 'Test', panels: [existingPanel] },
          operations: [
            {
              operation: 'edit_panels',
              panels: [
                {
                  source: 'request',
                  panelId: existingPanel.id,
                  query: 'change the title',
                  ...panelInput,
                },
              ],
            } as DashboardOperation,
          ],
          logger,
          resolvePanelContent,
        });
        return { result, resolvePanelContent };
      };

      const customContentPanel: AttachmentPanel = {
        id: 'cc-1',
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: { template: '<div>Old</div>' },
        grid: { x: 0, y: 0, w: 24, h: 6 },
      };
      const vegaPanel: AttachmentPanel = {
        id: 'vega-1',
        type: VEGA_VIS_TYPE,
        config: { spec: '{}' },
        grid: { x: 0, y: 0, w: 24, h: 9 },
      };

      it('fails without calling the resolver when a custom_content edit omits renderer', async () => {
        const { result, resolvePanelContent } = await editWith(customContentPanel, {});

        expect(resolvePanelContent).not.toHaveBeenCalled();
        expect(result.failures).toEqual([
          {
            type: DASHBOARD_OPERATION_FAILURE_TYPES.editPanels,
            identifier: 'cc-1',
            error:
              'Panel "cc-1" is a custom content panel. Edit it with source: "request", renderer: "custom_content".',
          },
        ]);
      });

      it('resolves a custom_content edit that names its renderer', async () => {
        const { result, resolvePanelContent } = await editWith(customContentPanel, {
          renderer: 'custom_content',
        });

        expect(resolvePanelContent).toHaveBeenCalledWith(
          expect.objectContaining({ renderer: 'custom_content', nlQuery: 'change the title' })
        );
        expect(result.failures).toEqual([]);
      });

      it('infers vega from the existing panel when renderer is omitted', async () => {
        const { resolvePanelContent } = await editWith(vegaPanel, {});

        expect(resolvePanelContent).toHaveBeenCalledWith(
          expect.objectContaining({ renderer: 'vega' })
        );
      });

      it('fails without calling the resolver when an explicit renderer disagrees with the panel', async () => {
        const { result, resolvePanelContent } = await editWith(vegaPanel, { renderer: 'lens' });

        expect(resolvePanelContent).not.toHaveBeenCalled();
        expect(result.failures).toEqual([
          {
            type: DASHBOARD_OPERATION_FAILURE_TYPES.editPanels,
            identifier: 'vega-1',
            error: `Panel "vega-1" with type "${VEGA_VIS_TYPE}" cannot be edited with renderer: "lens". Use renderer: "vega".`,
          },
        ]);
      });

      it('fails when custom_content targets a Lens panel', async () => {
        const { result, resolvePanelContent } = await editWith(createLensPanel('panel-1'), {
          renderer: 'custom_content',
        });

        expect(resolvePanelContent).not.toHaveBeenCalled();
        expect(result.failures[0].error).toBe(
          `Panel "panel-1" with type "${LENS_EMBEDDABLE_TYPE}" cannot be edited with renderer: "custom_content". Use renderer: "lens".`
        );
      });

      it('points a request edit on a by-value panel to source: "config"', async () => {
        const { result, resolvePanelContent } = await editWith(
          createMarkdownPanel('md-1', 'old text'),
          {}
        );

        expect(resolvePanelContent).not.toHaveBeenCalled();
        expect(result.failures[0].error).toBe(
          'Panel "md-1" is a markdown panel. Edit it with source: "config", type: "markdown".'
        );
      });
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
                panelId: 'panel-1',
                query: 'make this a bar chart',
                applyChartRules: true,
                preserveESQL: true,
              },
              {
                source: 'request',
                panelId: 'panel-2',
                query: 'make this a line chart',
                applyChartRules: true,
                preserveESQL: false,
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

      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'panel-1',
          applyChartRules: true,
          preserveESQL: true,
        })
      );
      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'panel-2',
          applyChartRules: true,
          preserveESQL: false,
        })
      );

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
              { source: 'request', panelId: 'panel-1', query: 'first edit' },
              {
                source: 'request',
                panelId: 'panel-2',
                query: 'edit a different panel',
              },
              {
                source: 'request',
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
        },
        {
          type: DASHBOARD_OPERATION_FAILURE_TYPES.editPanels,
          identifier: 'panel-1',
          error: duplicateError,
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
                config: {
                  content: '### Updated summary',
                  settings: { open_links_in_new_tab: true },
                },
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
          config: { content: '### Updated summary', settings: { open_links_in_new_tab: true } },
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
                config: { content: 'new text', settings: { open_links_in_new_tab: true } },
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
          error: `Panel "panel-1" with type "${LENS_EMBEDDABLE_TYPE}" cannot be edited as markdown. Use source: "request" with the panel's renderer for Lens, Vega, or custom content panels.`,
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

    it('edits an ML anomaly charts panel in place by panelId', async () => {
      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >();

      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createAnomalyChartsPanel('charts-1')],
        },
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'config',
                type: 'ml_anomaly_charts',
                panelId: 'charts-1',
                config: {
                  job_ids: ['job-1'],
                  title: 'Anomaly charts of job-1 with severity > 50',
                  severity_threshold: 50,
                },
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
          id: 'charts-1',
          type: 'ml_anomaly_charts',
          config: {
            job_ids: ['job-1'],
            title: 'Anomaly charts of job-1 with severity > 50',
            severity_threshold: [{ min: 50 }],
          },
          grid: { x: 0, y: 0, w: 24, h: 15 },
        })
      );
    });

    it('records a failure when an ML charts config-source edit targets a non-ML panel', async () => {
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
                type: 'ml_anomaly_charts',
                panelId: 'panel-1',
                config: { job_ids: ['job-1'] },
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
          error: `Panel "panel-1" with type "${LENS_EMBEDDABLE_TYPE}" cannot be edited as anomaly charts. Use source: "request" with the panel's renderer for Lens, Vega, or custom content panels.`,
        },
      ]);
    });

    it('edits an ML anomaly swimlane panel in place by panelId', async () => {
      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >();

      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createAnomalySwimlanePanel('swim-1')],
        },
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'config',
                type: 'ml_anomaly_swimlane',
                panelId: 'swim-1',
                config: {
                  job_ids: ['job-1'],
                  swimlane_type: 'overall',
                  severity_threshold: 75,
                  title: 'Overall anomalies of job-1 (high severity)',
                },
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
          id: 'swim-1',
          type: 'ml_anomaly_swimlane',
          config: {
            job_ids: ['job-1'],
            swimlane_type: 'overall',
            severity_threshold: 75,
            title: 'Overall anomalies of job-1 (high severity)',
          },
          grid: { x: 0, y: 0, w: 48, h: 12 },
        })
      );
    });

    it('records a failure when an ML swimlane config-source edit targets a non-swimlane panel', async () => {
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
                type: 'ml_anomaly_swimlane',
                panelId: 'panel-1',
                config: { job_ids: ['job-1'], swimlane_type: 'overall' },
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
          error: `Panel "panel-1" with type "${LENS_EMBEDDABLE_TYPE}" cannot be edited as anomaly swim lane. Use source: "request" with the panel's renderer for Lens, Vega, or custom content panels.`,
        },
      ]);
    });

    it('edits an ML single metric viewer panel in place by panelId', async () => {
      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >();

      const result = await executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createSingleMetricViewerPanel('smv-1')],
        },
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'config',
                type: 'ml_single_metric_viewer',
                panelId: 'smv-1',
                config: {
                  job_ids: ['job-1'],
                  selected_entities: { 'host.name': 'web-01' },
                  title: 'Metric viewer for web-01',
                },
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
          id: 'smv-1',
          type: 'ml_single_metric_viewer',
          config: {
            job_ids: ['job-1'],
            selected_entities: { 'host.name': 'web-01' },
            title: 'Metric viewer for web-01',
          },
          grid: { x: 0, y: 0, w: 24, h: 15 },
        })
      );
    });

    it('records a failure when an ML single metric viewer config-source edit targets a non-SMV panel', async () => {
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
                type: 'ml_single_metric_viewer',
                panelId: 'panel-1',
                config: { job_ids: ['job-1'] },
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
          error: `Panel "panel-1" with type "${LENS_EMBEDDABLE_TYPE}" cannot be edited as single metric viewer. Use source: "request" with the panel's renderer for Lens, Vega, or custom content panels.`,
        },
      ]);
    });

    it('routes custom_content edits through the panel resolver with the existing panel', async () => {
      const existingPanel: AttachmentPanel = {
        id: 'cc-1',
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: { esql_query: ['FROM logs | STATS count = COUNT(*)'], template: '<div>Old</div>' },
        grid: { x: 0, y: 0, w: 24, h: 6 },
      };
      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >(async () =>
        createResolvedPanelContent({
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: { template: '<div>Server generated</div>' },
        })
      );

      const result = await executeDashboardOperations({
        dashboardData: { title: 'Test', description: 'Desc', panels: [existingPanel] },
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'request',
                renderer: 'custom_content',
                panelId: 'cc-1',
                query: 'updated prompt',
                esql: null,
              },
            ],
          },
        ],
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).toHaveBeenCalledWith({
        renderer: 'custom_content',
        operationType: 'edit_panels',
        identifier: 'cc-1',
        nlQuery: 'updated prompt',
        esql: null,
        existingPanel,
      });
      expect(result.failures).toEqual([]);
      expect(getPanelsOnly(result.dashboardData.panels)[0]).toEqual({
        ...existingPanel,
        config: { template: '<div>Server generated</div>' },
      });
    });

    it('resolves custom_content and Lens edits in the same parallel phase', async () => {
      const deferredByIdentifier = {
        'cc-1': createDeferred<PanelContentAttempt>(),
        'panel-1': createDeferred<PanelContentAttempt>(),
      };
      const resolvePanelContent = jest.fn<
        ReturnType<ResolvePanelContent>,
        Parameters<ResolvePanelContent>
      >(
        ({ identifier }) =>
          deferredByIdentifier[identifier as keyof typeof deferredByIdentifier].promise
      );

      const operationPromise = executeDashboardOperations({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [
            {
              id: 'cc-1',
              type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
              config: { template: '<div>Old</div>' },
              grid: { x: 0, y: 0, w: 24, h: 6 },
            },
            createLensPanel('panel-1', 6),
          ],
        },
        operations: [
          {
            operation: 'edit_panels',
            panels: [
              {
                source: 'request',
                renderer: 'custom_content',
                panelId: 'cc-1',
                query: 'add a border',
              },
              { source: 'request', panelId: 'panel-1', query: 'turn into a bar chart' },
            ],
          },
        ],
        logger,
        resolvePanelContent,
      });

      await waitForNextEventLoopTurn();
      expect(resolvePanelContent).toHaveBeenCalledTimes(2);

      deferredByIdentifier['panel-1'].resolve(
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'bar' } })
      );
      deferredByIdentifier['cc-1'].resolve(
        createResolvedPanelContent({
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: { template: '<div>New</div>' },
        })
      );

      const result = await operationPromise;
      expect(result.failures).toEqual([]);
      expect(getPanelsOnly(result.dashboardData.panels).map(({ config }) => config)).toEqual([
        { template: '<div>New</div>' },
        { type: 'bar' },
      ]);
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
                config: { content: '### New summary', settings: { open_links_in_new_tab: true } },
              },
              {
                source: 'request',
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
          config: { content: '### New summary', settings: { open_links_in_new_tab: true } },
        })
      );
      expect(topLevelPanels[1]).toEqual(
        expect.objectContaining({ id: 'panel-1', config: { type: 'bar' } })
      );
    });
  });

  it('throws when add_panels markdown item references an invalid sectionId', async () => {
    await expect(
      executeDashboardOperations({
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
                config: { content: '### Summary', settings: { open_links_in_new_tab: true } },
                grid: { x: 0, y: 0, w: 48, h: 5 },
                sectionId: 'nonexistent-section',
              },
            ],
          },
        ],
        logger,
      })
    ).rejects.toThrow('Section "nonexistent-section" not found.');
  });

  it('adds a custom_content panel through the panel resolver', async () => {
    const resolvePanelContent = jest.fn<
      ReturnType<ResolvePanelContent>,
      Parameters<ResolvePanelContent>
    >(async () =>
      createResolvedPanelContent({
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: {
          esql_query: ['FROM logs-* | STATS error_rate = AVG(error) BY host'],
          template: '<div>KPI</div>',
        },
      })
    );

    const result = await executeDashboardOperations({
      dashboardData: { title: 'Test', description: 'Desc', panels: [] },
      operations: [
        {
          operation: 'add_panels',
          panels: [
            {
              source: 'request',
              renderer: 'custom_content',
              query: 'Show error rate KPI',
              esql: 'FROM logs-* | STATS error_rate = AVG(error) BY host',
              grid: { x: 0, y: 0, w: 24, h: 6 },
            },
          ],
        },
      ],
      logger,
      resolvePanelContent,
    });

    expect(resolvePanelContent).toHaveBeenCalledWith({
      renderer: 'custom_content',
      operationType: 'add_panels',
      identifier: 'Show error rate KPI',
      nlQuery: 'Show error rate KPI',
      esql: 'FROM logs-* | STATS error_rate = AVG(error) BY host',
    });
    expect(result.failures).toEqual([]);
    const panels = getPanelsOnly(result.dashboardData.panels);
    expect(panels).toEqual([
      expect.objectContaining({
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: {
          esql_query: ['FROM logs-* | STATS error_rate = AVG(error) BY host'],
          template: '<div>KPI</div>',
        },
        grid: { x: 0, y: 0, w: 24, h: 6 },
      }),
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
});

describe('add_controls / remove_controls operations', () => {
  const logger = {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger;

  const emptyDashboard: DashboardAttachmentData = { title: 'Test', panels: [] };

  it('add_controls appends options_list_control with server-built esql_query', async () => {
    const { dashboardData } = await executeDashboardOperations({
      dashboardData: emptyDashboard,
      operations: [
        {
          operation: 'add_controls',
          controls: [
            {
              type: 'options_list_control',
              field_name: 'service.name',
              index: 'logs-*',
              title: 'Service',
            },
          ],
        },
      ],
      logger,
    });

    expect(dashboardData.pinned_panels).toHaveLength(1);
    const control = dashboardData.pinned_panels![0] as Record<string, unknown>;
    expect(control.type).toBe('options_list_control');
    expect(typeof control.id).toBe('string');
    expect(control.width).toBe('medium');
    expect(control.grow).toBe(true);
    const config = control.config as Record<string, unknown>;
    expect(config.values_source).toBe('esql');
    expect(config.esql_query).toBe('FROM logs-* | STATS BY `service.name`');
    expect(config.title).toBe('Service');
  });

  it('add_controls escapes ES|QL field identifiers in generated queries', async () => {
    const { dashboardData } = await executeDashboardOperations({
      dashboardData: emptyDashboard,
      operations: [
        {
          operation: 'add_controls',
          controls: [
            { type: 'options_list_control', field_name: 'labels.pod-name', index: 'logs-*' },
            {
              type: 'range_slider_control',
              field_name: 'kubernetes.labels.app.kubernetes.io/name',
              index: 'logs-*',
            },
          ],
        },
      ],
      logger,
    });

    const controls = dashboardData.pinned_panels as Array<Record<string, unknown>>;
    expect((controls[0].config as Record<string, unknown>).esql_query).toBe(
      'FROM logs-* | STATS BY `labels.pod-name`'
    );
    expect((controls[1].config as Record<string, unknown>).esql_query).toBe(
      'FROM logs-* | STATS BY `kubernetes.labels.app.kubernetes.io/name`'
    );
  });

  it('add_controls appends range_slider_control', async () => {
    const { dashboardData } = await executeDashboardOperations({
      dashboardData: emptyDashboard,
      operations: [
        {
          operation: 'add_controls',
          controls: [{ type: 'range_slider_control', field_name: 'latency', index: 'metrics-*' }],
        },
      ],
      logger,
    });

    expect(dashboardData.pinned_panels).toHaveLength(1);
    const control = dashboardData.pinned_panels![0] as Record<string, unknown>;
    expect(control.type).toBe('range_slider_control');
    const config = control.config as Record<string, unknown>;
    expect(config.values_source).toBe('esql');
    expect(config.esql_query).toBe('FROM metrics-* | STATS BY latency');
    expect(config.step).toBe(1);
  });

  it('add_controls appends time_slider_control without esql_query', async () => {
    const { dashboardData } = await executeDashboardOperations({
      dashboardData: emptyDashboard,
      operations: [{ operation: 'add_controls', controls: [{ type: 'time_slider_control' }] }],
      logger,
    });

    expect(dashboardData.pinned_panels).toHaveLength(1);
    const control = dashboardData.pinned_panels![0] as Record<string, unknown>;
    expect(control.type).toBe('time_slider_control');
    const config = control.config as Record<string, unknown>;
    expect(config).not.toHaveProperty('esql_query');
    expect(config).not.toHaveProperty('title');
    expect(config.start_percentage_of_time_range).toBe(0);
    expect(config.end_percentage_of_time_range).toBe(1);
  });

  it('add_controls skips extra time_slider_control controls in one operation', async () => {
    const { dashboardData, failures } = await executeDashboardOperations({
      dashboardData: emptyDashboard,
      operations: [
        {
          operation: 'add_controls',
          controls: [
            { type: 'time_slider_control' },
            { type: 'time_slider_control', user_requested: true },
            { type: 'options_list_control', field_name: 'service.name', index: 'logs-*' },
          ],
        },
      ],
      logger,
    });

    expect(dashboardData.pinned_panels).toHaveLength(2);
    expect((dashboardData.pinned_panels as Array<Record<string, unknown>>)[0].type).toBe(
      'time_slider_control'
    );
    expect((dashboardData.pinned_panels as Array<Record<string, unknown>>)[1].type).toBe(
      'options_list_control'
    );
    expect(failures).toEqual([
      {
        type: 'add_controls',
        identifier: 'controls[1]',
        error: 'A dashboard can contain at most one time_slider_control.',
      },
    ]);
  });

  it('add_controls silently skips an unrequested second time_slider_control on an existing dashboard', async () => {
    const { dashboardData: withTimeSlider } = await executeDashboardOperations({
      dashboardData: emptyDashboard,
      operations: [{ operation: 'add_controls', controls: [{ type: 'time_slider_control' }] }],
      logger,
    });

    const { dashboardData, failures } = await executeDashboardOperations({
      dashboardData: withTimeSlider,
      operations: [{ operation: 'add_controls', controls: [{ type: 'time_slider_control' }] }],
      logger,
    });

    expect(dashboardData.pinned_panels).toHaveLength(1);
    expect(failures).toEqual([]);
  });

  it('add_controls appends to existing controls', async () => {
    const { dashboardData: after1 } = await executeDashboardOperations({
      dashboardData: emptyDashboard,
      operations: [
        {
          operation: 'add_controls',
          controls: [{ type: 'options_list_control', field_name: 'host.name', index: 'logs-*' }],
        },
      ],
      logger,
    });

    const { dashboardData: after2 } = await executeDashboardOperations({
      dashboardData: after1,
      operations: [
        {
          operation: 'add_controls',
          controls: [{ type: 'options_list_control', field_name: 'env', index: 'logs-*' }],
        },
      ],
      logger,
    });

    expect(after2.pinned_panels).toHaveLength(2);
  });

  describe('field validation', () => {
    type ControlsInput = Extract<DashboardOperation, { operation: 'add_controls' }>['controls'];
    const index = 'kibana_sample_data_logs';

    const addControls = (
      controls: ControlsInput,
      resolveControlFieldCapabilities: ResolveControlFieldCapabilities,
      dashboardData: DashboardAttachmentData = emptyDashboard
    ) =>
      executeDashboardOperations({
        dashboardData,
        operations: [{ operation: 'add_controls', controls }],
        logger,
        resolveControlFieldCapabilities,
      });

    const getEsqlQueries = ({ pinned_panels: pinnedPanels = [] }: DashboardAttachmentData) =>
      pinnedPanels.map(
        (panel) => (panel as unknown as { config: { esql_query?: string } }).config.esql_query
      );

    it('keeps controls on supported field types', async () => {
      const { dashboardData, failures } = await addControls(
        [
          { type: 'options_list_control', field_name: 'client.ip', index },
          { type: 'options_list_control', field_name: 'status', index },
          { type: 'range_slider_control', field_name: 'bytes', index },
        ],
        createFieldCapabilitiesResolver({
          'client.ip': usable('ip'),
          status: usable('keyword'),
          bytes: usable('long'),
        })
      );

      expect(failures).toEqual([]);
      expect(getEsqlQueries(dashboardData)).toEqual([
        `FROM ${index} | STATS BY \`client.ip\``,
        `FROM ${index} | STATS BY status`,
        `FROM ${index} | STATS BY bytes`,
      ]);
    });

    it.each([
      ['a non-aggregatable text field', NOT_AGGREGATABLE],
      ['an aggregatable text field', usable('text')],
    ])('uses the keyword sibling of %s', async (_, hostCapability) => {
      const { dashboardData, failures } = await addControls(
        [{ type: 'options_list_control', field_name: 'host', index }],
        createFieldCapabilitiesResolver({ host: hostCapability, 'host.keyword': usable('keyword') })
      );

      expect(failures).toEqual([]);
      expect(getEsqlQueries(dashboardData)).toEqual([`FROM ${index} | STATS BY \`host.keyword\``]);
    });

    const notMapped = `Not mapped on index "${index}".`;
    const notAggregatable = `Is not aggregatable on index "${index}".`;
    const conflicting = `Has conflicting mappings on index "${index}".`;
    const optionsListType = `options_list_control needs a keyword, numeric, date, ip, boolean, or version field on index "${index}".`;
    const rangeSliderType = `range_slider_control needs a numeric field on index "${index}".`;

    it.each([
      ['options_list_control', 'is not mapped', {}, notMapped],
      [
        'options_list_control',
        'is text without a keyword sibling',
        { field: NOT_AGGREGATABLE },
        notAggregatable,
      ],
      ['options_list_control', 'has conflicting mappings', { field: CONFLICTING }, conflicting],
      ['range_slider_control', 'has conflicting mappings', { field: CONFLICTING }, conflicting],
      [
        'options_list_control',
        'is aggregate_metric_double',
        { field: usable('aggregate_metric_double') },
        optionsListType,
      ],
      ['options_list_control', 'is geo_point', { field: usable('geo_point') }, optionsListType],
      ['range_slider_control', 'is keyword', { field: usable('keyword') }, rangeSliderType],
      [
        'range_slider_control',
        'is aggregate_metric_double',
        { field: usable('aggregate_metric_double') },
        rangeSliderType,
      ],
    ] as const)('reports a user-requested %s whose field %s', async (type, _, fields, error) => {
      const { dashboardData, failures } = await addControls(
        [{ type, field_name: 'field', index, user_requested: true }],
        createFieldCapabilitiesResolver(fields)
      );

      expect(getEsqlQueries(dashboardData)).toEqual([]);
      expect(failures).toEqual([
        { type: DASHBOARD_OPERATION_FAILURE_TYPES.addControls, identifier: 'field', error },
      ]);
    });

    it('silently leaves out an unresolved control the user did not request', async () => {
      const { dashboardData, failures } = await addControls(
        [{ type: 'options_list_control', field_name: 'method', index }],
        createFieldCapabilitiesResolver({})
      );

      expect(getEsqlQueries(dashboardData)).toEqual([]);
      expect(failures).toEqual([]);
    });

    it('groups user-requested failures that share a reason', async () => {
      const { failures } = await addControls(
        ['http_method', 'status_code'].map((fieldName) => ({
          type: 'options_list_control' as const,
          field_name: fieldName,
          index,
          user_requested: true,
        })),
        createFieldCapabilitiesResolver({})
      );

      expect(failures).toEqual([
        {
          type: DASHBOARD_OPERATION_FAILURE_TYPES.addControls,
          identifier: 'http_method, status_code',
          error: notMapped,
        },
      ]);
    });

    it('requests only candidate fields, once per index, with the dashboard project routing', async () => {
      const resolveFieldCapabilities = createFieldCapabilitiesResolver({ host: usable('keyword') });

      await addControls(
        [
          { type: 'options_list_control', field_name: 'host', index },
          { type: 'options_list_control', field_name: 'service.name', index },
        ],
        resolveFieldCapabilities,
        { ...emptyDashboard, project_routing: '_alias:*' }
      );

      expect(resolveFieldCapabilities).toHaveBeenCalledTimes(1);
      expect(resolveFieldCapabilities).toHaveBeenCalledWith({
        index,
        fieldNames: ['host', 'host.keyword', 'service.name', 'service.name.keyword'],
        projectRouting: '_alias:*',
      });
    });

    it('keeps controls unvalidated when field loading fails', async () => {
      const resolveFieldCapabilities = createFieldCapabilitiesResolver({});
      resolveFieldCapabilities.mockRejectedValue(new Error('field caps unavailable'));

      const { dashboardData, failures } = await addControls(
        [{ type: 'options_list_control', field_name: 'host', index, user_requested: true }],
        resolveFieldCapabilities
      );

      expect(failures).toEqual([]);
      expect(getEsqlQueries(dashboardData)).toEqual([`FROM ${index} | STATS BY host`]);
    });
  });

  it('remove_controls removes by id and leaves others intact', async () => {
    const { dashboardData: withControls } = await executeDashboardOperations({
      dashboardData: emptyDashboard,
      operations: [
        {
          operation: 'add_controls',
          controls: [
            {
              type: 'options_list_control',
              field_name: 'service.name',
              index: 'logs-*',
              title: 'Service',
            },
            {
              type: 'options_list_control',
              field_name: 'host.name',
              index: 'logs-*',
              title: 'Host',
            },
          ],
        },
      ],
      logger,
    });

    const controls = withControls.pinned_panels as Array<Record<string, unknown>>;
    expect(controls).toHaveLength(2);
    const idToRemove = controls[0].id as string;

    const { dashboardData: afterRemove } = await executeDashboardOperations({
      dashboardData: withControls,
      operations: [{ operation: 'remove_controls', control_ids: [idToRemove] }],
      logger,
    });

    expect(afterRemove.pinned_panels).toHaveLength(1);
    const remaining = (afterRemove.pinned_panels as Array<Record<string, unknown>>)[0];
    expect(remaining.id).not.toBe(idToRemove);
    expect((remaining.config as Record<string, unknown>).title).toBe('Host');
  });

  it('remove_controls with unknown id leaves controls unchanged', async () => {
    const { dashboardData: withControl } = await executeDashboardOperations({
      dashboardData: emptyDashboard,
      operations: [
        {
          operation: 'add_controls',
          controls: [{ type: 'options_list_control', field_name: 'env', index: 'logs-*' }],
        },
      ],
      logger,
    });

    const { dashboardData: afterRemove } = await executeDashboardOperations({
      dashboardData: withControl,
      operations: [{ operation: 'remove_controls', control_ids: ['nonexistent-id'] }],
      logger,
    });

    expect(afterRemove.pinned_panels).toHaveLength(1);
  });

  describe('attachment-source panels', () => {
    // The point of the source: the model places a visualization it already created without
    // copying its payload back through the tool call.
    it('adds a panel from a visualization attachment without a config in the input', async () => {
      const resolveAttachmentPanel = jest.fn().mockReturnValue({
        type: 'success',
        panelContent: { type: 'lens', config: { type: 'lnsXY' } },
      });

      const result = await executeDashboardOperations({
        dashboardData: { title: 'Test dashboard', description: '', panels: [] },
        operations: [
          {
            operation: 'add_panels',
            panels: [
              {
                source: 'attachment',
                attachment_id: 'att-1',
                grid: { x: 0, y: 0, w: 24, h: 10 },
              },
            ],
          },
        ],
        logger,
        resolveAttachmentPanel,
      });

      expect(resolveAttachmentPanel).toHaveBeenCalledWith('att-1', 'add_panels');
      expect(result.failures).toHaveLength(0);
      expect(result.dashboardData.panels).toEqual([
        expect.objectContaining({ type: 'lens', config: { type: 'lnsXY' } }),
      ]);
    });

    // add_section takes the same panel inputs as add_panels, so it needs the same resolver wired
    // in. Without it the materializer throws, which fails the whole dashboard rather than a panel.
    it('adds an attachment panel inside a new section', async () => {
      const resolveAttachmentPanel = jest.fn().mockReturnValue({
        type: 'success',
        panelContent: { type: 'lens', config: { type: 'lnsXY' } },
      });

      const result = await executeDashboardOperations({
        dashboardData: { title: 'Test dashboard', description: '', panels: [] },
        operations: [
          {
            operation: 'add_section',
            title: 'Overview',
            grid: { y: 0 },
            panels: [
              {
                source: 'attachment',
                attachment_id: 'att-1',
                grid: { x: 0, y: 0, w: 24, h: 10 },
              },
            ],
          },
        ],
        logger,
        resolveAttachmentPanel,
      });

      expect(resolveAttachmentPanel).toHaveBeenCalledWith('att-1', 'add_section');
      expect(result.failures).toHaveLength(0);
      expect(getSections(result.dashboardData.panels)).toHaveLength(1);
    });

    it('keeps the section when an attachment inside it cannot be resolved', async () => {
      const resolveAttachmentPanel = jest.fn().mockReturnValue({
        type: 'failure',
        failure: { type: 'add_section', identifier: 'att-missing', error: 'not found' },
      });

      const result = await executeDashboardOperations({
        dashboardData: { title: 'Test dashboard', description: '', panels: [] },
        operations: [
          {
            operation: 'add_section',
            title: 'Overview',
            grid: { y: 0 },
            panels: [
              {
                source: 'attachment',
                attachment_id: 'att-missing',
                grid: { x: 0, y: 0, w: 24, h: 10 },
              },
            ],
          },
        ],
        logger,
        resolveAttachmentPanel,
      });

      expect(result.failures).toEqual([
        expect.objectContaining({ type: 'add_section', identifier: 'att-missing' }),
      ]);
      expect(getSections(result.dashboardData.panels)).toHaveLength(1);
    });

    it('places the resolvable panels when one attachment in the batch fails', async () => {
      const resolveAttachmentPanel = jest.fn((attachmentId: string) =>
        attachmentId === 'att-missing'
          ? ({
              type: 'failure',
              failure: { type: 'add_panels', identifier: attachmentId, error: 'not found' },
            } as const)
          : ({
              type: 'success',
              panelContent: { type: 'lens', config: { type: 'lnsXY' } },
            } as const)
      );

      const result = await executeDashboardOperations({
        dashboardData: { title: 'Test dashboard', description: '', panels: [] },
        operations: [
          {
            operation: 'add_panels',
            panels: [
              { source: 'attachment', attachment_id: 'att-1', grid: { x: 0, y: 0, w: 24, h: 10 } },
              {
                source: 'attachment',
                attachment_id: 'att-missing',
                grid: { x: 24, y: 0, w: 24, h: 10 },
              },
            ],
          },
        ],
        logger,
        resolveAttachmentPanel,
      });

      expect(result.failures).toHaveLength(1);
      expect(result.dashboardData.panels).toHaveLength(1);
    });

    it('records a failure and skips the panel when the attachment cannot be resolved', async () => {
      const resolveAttachmentPanel = jest.fn().mockReturnValue({
        type: 'failure',
        failure: { type: 'add_panels', identifier: 'att-missing', error: 'not found' },
      });

      const result = await executeDashboardOperations({
        dashboardData: { title: 'Test dashboard', description: '', panels: [] },
        operations: [
          {
            operation: 'add_panels',
            panels: [
              {
                source: 'attachment',
                attachment_id: 'att-missing',
                grid: { x: 0, y: 0, w: 24, h: 10 },
              },
            ],
          },
        ],
        logger,
        resolveAttachmentPanel,
      });

      expect(result.dashboardData.panels).toHaveLength(0);
      expect(result.failures).toEqual([
        expect.objectContaining({ identifier: 'att-missing', error: 'not found' }),
      ]);
    });
  });
});
