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
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import type { ResolvePanelContent, UpsertPanelContent } from '../operations/panels';
import { createPanelFailureResult, type PanelContentAttempt } from '../resolve_panel';
import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import type { ControlFieldCapability, ResolveControlFieldCapabilities } from '../types';
import type { ValidateDashboard } from '../validate_dashboard';
import { executeDashboardUpsert } from './upsert_dashboard';
import { upsertDashboardSchema, type DashboardUpsert } from './schema';

const UPSERT_FAILURE = DASHBOARD_FAILURE_TYPES.upsertDashboard;
const GRID = { x: 0, y: 0, w: 24, h: 9 };

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
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
};

const waitForNextEventLoopTurn = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve));

const getSections = (panels: DashboardAttachmentData['panels']): DashboardSection[] =>
  panels.filter(isSection);

const getPanelsOnly = (panels: DashboardAttachmentData['panels']): AttachmentPanel[] =>
  panels.filter((p): p is AttachmentPanel => !isSection(p));

const getSection = (
  { panels }: DashboardAttachmentData,
  sectionId: string
): DashboardSection | undefined => getSections(panels).find(({ id }) => id === sectionId);

/** Finds a panel by id at the top level or inside a section. */
const findPanel = (
  { panels }: DashboardAttachmentData,
  panelId: string
): AttachmentPanel | undefined =>
  [...getPanelsOnly(panels), ...getSections(panels).flatMap((section) => section.panels)].find(
    ({ id }) => id === panelId
  );

const getIds = (panels: DashboardAttachmentData['panels']): string[] => panels.map(({ id }) => id);

const createResolverMock = (
  implementation?: ResolvePanelContent
): jest.Mock<ReturnType<ResolvePanelContent>, Parameters<ResolvePanelContent>> =>
  jest.fn<ReturnType<ResolvePanelContent>, Parameters<ResolvePanelContent>>(implementation);

const ESQL_METRIC_CONFIG = {
  type: 'metric',
  data_source: { type: 'esql', query: 'FROM logs | STATS count()' },
};

describe('executeDashboardUpsert', () => {
  const logger = createMockLogger();
  const createLensPanel = (id: string, gridY = 0): AttachmentPanel => ({
    type: LENS_EMBEDDABLE_TYPE,
    id,
    config: ESQL_METRIC_CONFIG,
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

  const metricRequest = (query: string): UpsertPanelContent => ({
    source: 'request',
    chartType: SupportedChartType.Metric,
    query,
  });

  const metricAttachment: UpsertPanelContent = {
    source: 'attachment',
    attachment_id: 'metric-vis',
  };

  const markdownContent = (content: string): UpsertPanelContent => ({
    source: 'config',
    type: 'markdown',
    config: { content, settings: { open_links_in_new_tab: true } },
  });

  it('applies metadata, removals, and new panels in one call', async () => {
    const baseDashboardData: DashboardAttachmentData = {
      title: 'Original title',
      description: 'Original description',
      panels: [createLensPanel('existing-panel')],
    };

    const result = await executeDashboardUpsert({
      dashboardData: baseDashboardData,
      upsert: {
        title: 'Updated title',
        remove: ['existing-panel'],
        panels: [
          { id: 'metric', grid: GRID, content: metricAttachment },
          { id: 'summary', grid: GRID, content: markdownContent('### Updated summary') },
        ],
      },
      logger,
      resolveAttachmentPanel: resolveMetricAttachment,
    });

    expect(result.failures).toEqual([]);
    expect(result.dashboardData.title).toBe('Updated title');
    expect(result.dashboardData.description).toBe('Original description');
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({
        id: 'metric',
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
      }),
      expect.objectContaining({
        id: 'summary',
        type: MARKDOWN_EMBEDDABLE_TYPE,
        config: { content: '### Updated summary', settings: { open_links_in_new_tab: true } },
      }),
    ]);
    expect(result.created).toEqual(['metric', 'summary']);
    expect(result.updated).toEqual([]);
  });

  it('sets the description and time range', async () => {
    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Title', description: 'Old', panels: [] },
      upsert: {
        description: 'New description',
        time_range: { from: 'now-7d', to: 'now' },
      },
      logger,
    });

    expect(result.failures).toEqual([]);
    expect(result.dashboardData).toEqual(
      expect.objectContaining({
        title: 'Title',
        description: 'New description',
        time_range: { from: 'now-7d', to: 'now' },
      })
    );
  });

  it('clears the description when it is set to an empty string', async () => {
    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Title', description: 'Old', panels: [] },
      upsert: { description: '' },
      logger,
    });

    expect(result.failures).toEqual([]);
    expect(result.dashboardData.description).toBe('');
  });

  it('starts from an empty dashboard when no dashboard data is given', async () => {
    const result = await executeDashboardUpsert({
      upsert: {
        title: 'New dashboard',
        panels: [{ id: 'summary', grid: GRID, content: markdownContent('Hello') }],
      },
      logger,
    });

    expect(result.dashboardData.title).toBe('New dashboard');
    expect(getIds(result.dashboardData.panels)).toEqual(['summary']);
  });

  it('adds attachment-source panels successfully', async () => {
    const resolveAttachmentPanel = jest.fn<PanelContentAttempt, [string]>(resolveMetricAttachment);

    const result = await executeDashboardUpsert({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [],
      },
      upsert: {
        panels: [
          { id: 'metric-1', grid: GRID, content: metricAttachment },
          { id: 'metric-2', grid: GRID, content: metricAttachment },
          { id: 'metric-3', grid: GRID, content: metricAttachment },
        ],
      },
      logger,
      resolveAttachmentPanel,
    });

    expect(resolveAttachmentPanel).toHaveBeenCalledTimes(3);
    expect(resolveAttachmentPanel).toHaveBeenCalledWith('metric-vis');
    expect(result.dashboardData.panels).toEqual(
      ['metric-1', 'metric-2', 'metric-3'].map((id) =>
        expect.objectContaining({ id, type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric' } })
      )
    );
    expect(result.failures).toEqual([]);
  });

  it('adds mixed panel kinds across top-level and section targets', async () => {
    const result = await executeDashboardUpsert({
      dashboardData: {
        title: 'Test dashboard',
        description: 'Description',
        panels: [createSection('section-a', 'Section A', 8)],
      },
      upsert: {
        panels: [
          { id: 'summary', grid: GRID, content: markdownContent('### Summary') },
          { id: 'section-metric', section: 'section-a', grid: GRID, content: metricAttachment },
          { id: 'total-requests', grid: GRID, content: metricRequest('show total requests') },
          { id: 'top-metric', grid: GRID, content: metricAttachment },
          {
            id: 'p95-latency',
            section: 'section-a',
            grid: GRID,
            content: metricRequest('show p95 latency'),
          },
        ],
      },
      logger,
      resolveAttachmentPanel: resolveMetricAttachment,
      resolvePanelContent: createResolvePanelContent({
        'total-requests': createResolvedPanelContent(
          {
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          },
          'Created a titleless metric showing total requests.'
        ),
        'p95-latency': createPanelFailureResult('p95-latency', 'ES|QL generation failed'),
      }),
    });

    const topLevelPanels = getPanelsOnly(result.dashboardData.panels);
    expect(getIds(topLevelPanels).sort()).toEqual(['summary', 'top-metric', 'total-requests']);
    expect(findPanel(result.dashboardData, 'summary')).toEqual(
      expect.objectContaining({
        type: MARKDOWN_EMBEDDABLE_TYPE,
        config: { content: '### Summary', settings: { open_links_in_new_tab: true } },
      })
    );
    expect(findPanel(result.dashboardData, 'total-requests')).toEqual(
      expect.objectContaining({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric' } })
    );
    expect(getSection(result.dashboardData, 'section-a')?.panels).toEqual([
      expect.objectContaining({
        id: 'section-metric',
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'metric' },
      }),
    ]);
    expect(result.failures).toEqual([
      {
        type: UPSERT_FAILURE,
        identifier: 'p95-latency',
        error: 'ES|QL generation failed',
      },
    ]);
    expect(result.panelAuthoringNotes).toEqual([
      {
        panelId: 'total-requests',
        authoringNote: 'Created a titleless metric showing total requests.',
      },
    ]);
  });

  it('creates ML panels from by-value configs', async () => {
    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Test', panels: [] },
      upsert: {
        panels: [
          {
            id: 'charts',
            grid: GRID,
            content: {
              source: 'config',
              type: 'ml_anomaly_charts',
              config: { job_ids: ['job-1'], severity_threshold: 50 },
            },
          },
          {
            id: 'swimlane',
            grid: GRID,
            content: {
              source: 'config',
              type: 'ml_anomaly_swimlane',
              config: { job_ids: ['job-1'], swimlane_type: 'overall' },
            },
          },
          {
            id: 'smv',
            grid: GRID,
            content: {
              source: 'config',
              type: 'ml_single_metric_viewer',
              config: { job_ids: ['job-1'] },
            },
          },
        ],
      },
      logger,
    });

    expect(result.failures).toEqual([]);
    expect(findPanel(result.dashboardData, 'charts')).toEqual(
      expect.objectContaining({
        type: 'ml_anomaly_charts',
        config: { job_ids: ['job-1'], severity_threshold: [{ min: 50 }] },
      })
    );
    expect(findPanel(result.dashboardData, 'swimlane')).toEqual(
      expect.objectContaining({
        type: 'ml_anomaly_swimlane',
        config: { job_ids: ['job-1'], swimlane_type: 'overall' },
      })
    );
    expect(findPanel(result.dashboardData, 'smv')).toEqual(
      expect.objectContaining({ type: 'ml_single_metric_viewer', config: { job_ids: ['job-1'] } })
    );
  });

  it('preserves dashboard metadata and sections while adding panels', async () => {
    const result = await executeDashboardUpsert({
      dashboardData: {
        title: 'Existing title',
        description: 'Existing description',
        panels: [createSection('section-1', 'Section 1', 10)],
      },
      upsert: { panels: [{ id: 'metric', grid: GRID, content: metricAttachment }] },
      logger,
      resolveAttachmentPanel: resolveMetricAttachment,
    });

    expect(result.dashboardData.title).toBe('Existing title');
    expect(result.dashboardData.description).toBe('Existing description');
    expect(getSections(result.dashboardData.panels)).toEqual([
      expect.objectContaining({
        id: 'section-1',
        title: 'Section 1',
        collapsed: false,
        panels: [],
      }),
    ]);
    expect(result.dashboardData.panels).toHaveLength(2); // 1 section + 1 panel
  });

  it('creates new panels at the given grid and keeps existing panels in place', async () => {
    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Test', panels: [createLensPanel('existing', 0)] },
      upsert: {
        panels: [
          { id: 'beside', content: metricAttachment, grid: { x: 24, y: 0, w: 24, h: 9 } },
          { id: 'below', content: markdownContent('Notes'), grid: { x: 0, y: 9, w: 48, h: 6 } },
        ],
      },
      logger,
      resolveAttachmentPanel: resolveMetricAttachment,
    });

    expect(result.failures).toEqual([]);
    expect(findPanel(result.dashboardData, 'existing')?.grid).toEqual({ x: 0, y: 0, w: 24, h: 9 });
    expect(findPanel(result.dashboardData, 'beside')?.grid).toEqual({ x: 24, y: 0, w: 24, h: 9 });
    expect(findPanel(result.dashboardData, 'below')?.grid).toEqual({ x: 0, y: 9, w: 48, h: 6 });
  });

  it('records a failure when a new panel has no grid', async () => {
    const resolveAttachmentPanel = jest.fn<PanelContentAttempt, [string]>(resolveMetricAttachment);
    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Test', panels: [] },
      upsert: { panels: [{ id: 'metric', content: metricAttachment }] },
      logger,
      resolveAttachmentPanel,
    });

    expect(resolveAttachmentPanel).not.toHaveBeenCalled();
    expect(result.dashboardData.panels).toEqual([]);
    expect(result.failures).toEqual([
      {
        type: UPSERT_FAILURE,
        identifier: 'metric',
        error: 'Panel "metric" is new. Provide `grid` ({ x, y, w, h }) to create it.',
      },
    ]);
  });

  describe('sections', () => {
    it('adds an empty section with the given id and default collapsed=false', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        upsert: { sections: [{ id: 'overview', title: 'Overview' }] },
        logger,
      });

      expect(result.failures).toEqual([]);
      const sections = getSections(result.dashboardData.panels);
      expect(sections).toHaveLength(1);
      expect(sections[0]).toEqual({
        id: 'overview',
        title: 'Overview',
        collapsed: false,
        grid: { y: expect.any(Number) },
        panels: [],
      });
    });

    it('updates the title and collapsed state of an existing section and keeps its panels', async () => {
      const sectionPanel = createLensPanel('section-panel-1');
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          panels: [createSection('section-a', 'Section A', 0, [sectionPanel])],
        },
        upsert: { sections: [{ id: 'section-a', title: 'Renamed', collapsed: true }] },
        logger,
      });

      expect(result.failures).toEqual([]);
      expect(getSections(result.dashboardData.panels)).toEqual([
        {
          id: 'section-a',
          title: 'Renamed',
          collapsed: true,
          grid: { y: 0 },
          panels: [sectionPanel],
        },
      ]);
      expect(result.created).toEqual([]);
      expect(result.updated).toEqual(['section-a']);
    });

    it('records a failure when a new section has no title', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [] },
        upsert: { sections: [{ id: 'overview' }] },
        logger,
      });

      expect(getSections(result.dashboardData.panels)).toEqual([]);
      expect(result.failures).toEqual([
        {
          type: UPSERT_FAILURE,
          identifier: 'overview',
          error: 'Section "overview" does not exist. Provide a title to create it.',
        },
      ]);
    });

    it('records a failure for each occurrence of a duplicated section id', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [] },
        upsert: {
          sections: [
            { id: 'overview', title: 'Overview' },
            { id: 'overview', title: 'Another overview' },
          ],
        },
        logger,
      });

      const duplicateFailure = {
        type: UPSERT_FAILURE,
        identifier: 'overview',
        error: 'Section "overview" appears more than once. List each section once.',
      };
      expect(getSections(result.dashboardData.panels)).toEqual([]);
      expect(result.failures).toEqual([duplicateFailure, duplicateFailure]);
    });

    it('rejects a section id that is already a panel id', async () => {
      const panel = createLensPanel('overview');
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [panel] },
        upsert: { sections: [{ id: 'overview', title: 'Overview' }] },
        logger,
      });

      expect(result.dashboardData.panels).toEqual([panel]);
      expect(result.failures).toEqual([
        {
          type: UPSERT_FAILURE,
          identifier: 'overview',
          error: '"overview" is a panel id. Use a different id for the section.',
        },
      ]);
    });

    it('rejects a panel id that is already a section id', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [createSection('overview', 'Overview', 0)] },
        upsert: { panels: [{ id: 'overview', content: markdownContent('Text') }] },
        logger,
      });

      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(result.failures).toEqual([
        {
          type: UPSERT_FAILURE,
          identifier: 'overview',
          error: '"overview" is a section id. Use a different id for the panel.',
        },
      ]);
    });

    it('moves existing panels and adds resolved panels into new sections in one call', async () => {
      const topPanel = createLensPanel('top-panel');
      const nestedPanel = createLensPanel('nested-panel');
      const dashboardData: DashboardAttachmentData = {
        title: 'Test dashboard',
        panels: [topPanel, createSection('existing-section', 'Existing', 10, [nestedPanel])],
      };
      const upsert: DashboardUpsert = {
        sections: [
          { id: 'overview', title: 'Overview' },
          { id: 'details', title: 'Details' },
        ],
        panels: [
          { id: 'top-panel', section: 'overview' },
          { id: 'nested-panel', section: 'details', grid: { x: 0, y: 0, w: 48, h: 8 } },
          { id: 'summary', section: 'overview', grid: GRID, content: markdownContent('Summary') },
          {
            id: 'total-requests',
            grid: GRID,
            section: 'details',
            content: metricRequest('show total requests'),
          },
        ],
      };
      const originalInputs = structuredClone({ dashboardData, upsert });

      const result = await executeDashboardUpsert({
        dashboardData,
        upsert,
        logger,
        resolvePanelContent: createResolvePanelContent(),
      });

      expect(result.failures).toEqual([]);
      expect(getSection(result.dashboardData, 'existing-section')?.panels).toEqual([]);
      expect(getSection(result.dashboardData, 'overview')?.panels).toEqual([
        expect.objectContaining({ id: 'top-panel', config: topPanel.config }),
        expect.objectContaining({
          id: 'summary',
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: 'Summary', settings: { open_links_in_new_tab: true } },
        }),
      ]);
      expect(getSection(result.dashboardData, 'details')?.panels).toEqual([
        expect.objectContaining({
          id: 'nested-panel',
          config: nestedPanel.config,
          grid: { x: 0, y: 0, w: 48, h: 8 },
        }),
        expect.objectContaining({
          id: 'total-requests',
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
        }),
      ]);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect({ dashboardData, upsert }).toEqual(originalInputs);
    });

    it('adds a section with inline visualization panels in a single call', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        upsert: {
          sections: [{ id: 'overview', title: 'Overview' }],
          panels: [
            {
              id: 'total-requests',
              grid: GRID,
              section: 'overview',
              content: metricRequest('show total requests'),
            },
            {
              id: 'error-rate',
              section: 'overview',
              grid: GRID,
              content: metricRequest('show error rate'),
            },
          ],
        },
        logger,
        resolvePanelContent: createResolvePanelContent({
          'total-requests': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          'error-rate': createResolvedPanelContent({
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
        id: 'overview',
        title: 'Overview',
        collapsed: false,
        grid: { y: expect.any(Number) },
        panels: [
          expect.objectContaining({
            id: 'total-requests',
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          expect.objectContaining({
            id: 'error-rate',
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'bar' },
          }),
        ],
      });
    });

    it('records inline visualization failures when adding a section and keeps successful panels', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        upsert: {
          sections: [{ id: 'overview', title: 'Overview' }],
          panels: [
            {
              id: 'total-requests',
              grid: GRID,
              section: 'overview',
              content: metricRequest('show total requests'),
            },
            {
              id: 'p95-latency',
              section: 'overview',
              grid: GRID,
              content: metricRequest('show p95 latency'),
            },
          ],
        },
        logger,
        resolvePanelContent: createResolvePanelContent({
          'total-requests': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          'p95-latency': createPanelFailureResult('p95-latency', 'ES|QL generation failed'),
        }),
      });

      const sections = getSections(result.dashboardData.panels);

      expect(sections).toHaveLength(1);
      expect(sections[0].panels).toEqual([
        expect.objectContaining({
          id: 'total-requests',
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
        }),
      ]);
      expect(result.failures).toEqual([
        {
          type: UPSERT_FAILURE,
          identifier: 'p95-latency',
          error: 'ES|QL generation failed',
        },
      ]);
    });

    it('adds non-visualization section panels without invoking the panel resolver', async () => {
      const resolvePanelContent = createResolverMock();

      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        upsert: {
          sections: [{ id: 'overview', title: 'Overview' }],
          panels: [
            {
              id: 'summary',
              grid: GRID,
              section: 'overview',
              content: markdownContent('### Section Summary'),
            },
            { id: 'metric', section: 'overview', grid: GRID, content: metricAttachment },
          ],
        },
        logger,
        resolveAttachmentPanel: resolveMetricAttachment,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(getSection(result.dashboardData, 'overview')?.panels).toEqual([
        expect.objectContaining({
          id: 'summary',
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: '### Section Summary', settings: { open_links_in_new_tab: true } },
        }),
        expect.objectContaining({
          id: 'metric',
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
        }),
      ]);
    });

    it('adds attachment-source panels into a target section', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [createSection('section-a', 'Section A', 8)],
        },
        upsert: {
          panels: [
            {
              id: 'metric',
              section: 'section-a',
              content: metricAttachment,
              grid: { x: 0, y: 0, w: 12, h: 5 },
            },
          ],
        },
        logger,
        resolveAttachmentPanel: resolveMetricAttachment,
      });

      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(getSection(result.dashboardData, 'section-a')?.panels).toEqual([
        expect.objectContaining({
          id: 'metric',
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
          grid: { x: 0, y: 0, w: 12, h: 5 },
        }),
      ]);
    });

    it('adds a markdown panel into a target section', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [createSection('section-a', 'Section A', 0)],
        },
        upsert: {
          panels: [
            {
              id: 'summary',
              grid: GRID,
              section: 'section-a',
              content: markdownContent('### Section Summary'),
            },
          ],
        },
        logger,
      });

      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(getSection(result.dashboardData, 'section-a')?.panels).toEqual([
        expect.objectContaining({
          id: 'summary',
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: '### Section Summary', settings: { open_links_in_new_tab: true } },
        }),
      ]);
    });

    it('records a failure when a panel references an unknown section', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        upsert: {
          panels: [
            {
              id: 'summary',
              section: 'nonexistent-section',
              content: markdownContent('### Summary'),
            },
          ],
        },
        logger,
      });

      expect(result.dashboardData.panels).toEqual([]);
      expect(result.failures).toEqual([
        {
          type: UPSERT_FAILURE,
          identifier: 'summary',
          error:
            'Section "nonexistent-section" not found. Create it in `sections` or use an existing section id.',
        },
      ]);
    });

    it('removes a section together with the panels it contains', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [
            createLensPanel('top-1'),
            createSection('section-a', 'Section A', 10, [createLensPanel('section-a-1', 0)]),
          ],
        },
        upsert: { remove: ['section-a'] },
        logger,
      });

      expect(result.failures).toEqual([]);
      expect(getSections(result.dashboardData.panels)).toHaveLength(0);
      expect(result.dashboardData.panels).toEqual([expect.objectContaining({ id: 'top-1' })]);
    });

    it('keeps panels moved out of a section that is removed in the same call', async () => {
      const result = await executeDashboardUpsert({
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
        upsert: {
          panels: [
            { id: 'section-a-1', section: null },
            { id: 'section-a-2', section: null },
          ],
          remove: ['section-a'],
        },
        logger,
      });

      expect(result.failures).toEqual([]);
      expect(getSections(result.dashboardData.panels)).toHaveLength(0);
      expect(getIds(result.dashboardData.panels).sort()).toEqual([
        'section-a-1',
        'section-a-2',
        'top-1',
      ]);
    });

    it('rejects panels placed into a section that is removed in the same call', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [
            createLensPanel('top-1', 0),
            createSection('section-a', 'Section A', 10, [createLensPanel('section-a-1', 0)]),
          ],
        },
        upsert: {
          panels: [{ id: 'top-1', section: 'section-a' }],
          remove: ['section-a'],
        },
        logger,
      });

      expect(getSections(result.dashboardData.panels)).toHaveLength(0);
      expect(getIds(result.dashboardData.panels)).toEqual(['top-1']);
      expect(result.failures).toEqual([
        {
          type: UPSERT_FAILURE,
          identifier: 'top-1',
          error:
            'Section "section-a" is removed in this call. Place panel "top-1" in a section that stays, or keep the section.',
        },
      ]);
    });
  });

  describe('removals', () => {
    it('removes matching panel ids from top-level and section panels', async () => {
      const result = await executeDashboardUpsert({
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
        upsert: { remove: ['section-a-1', 'top-1'] },
        logger,
      });

      expect(result.failures).toEqual([]);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(getSections(result.dashboardData.panels)).toEqual([
        expect.objectContaining({
          id: 'section-a',
          title: 'Section A',
          collapsed: false,
          panels: [expect.objectContaining({ id: 'section-a-2' })],
        }),
      ]);
    });

    it('records a failure for an id that does not exist', async () => {
      const panel = createLensPanel('panel-1');
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [panel] },
        upsert: { remove: ['missing'] },
        logger,
      });

      expect(result.dashboardData.panels).toEqual([panel]);
      expect(result.failures).toEqual([
        {
          type: UPSERT_FAILURE,
          identifier: 'missing',
          error: 'Nothing with id "missing" exists on the dashboard.',
        },
      ]);
    });

    it('records a failure and applies neither change when an id is both updated and removed', async () => {
      const resolvePanelContent = createResolverMock(async () =>
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'bar' } })
      );

      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createLensPanel('panel-1', 5)],
        },
        upsert: {
          panels: [
            { id: 'panel-1', content: { source: 'request', query: 'make this a bar chart' } },
          ],
          remove: ['panel-1'],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(result.dashboardData.panels).toEqual([createLensPanel('panel-1', 5)]);
      expect(result.failures).toEqual([
        {
          type: UPSERT_FAILURE,
          identifier: 'panel-1',
          error:
            '"panel-1" is both updated and removed in this call, so neither change was applied. Do only one.',
        },
      ]);
    });
  });

  describe('moving and resizing panels', () => {
    it('resizes a panel without changing its section', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [
            createSection('section-a', 'Section A', 0, [createLensPanel('section-panel-1', 0)]),
          ],
        },
        upsert: { panels: [{ id: 'section-panel-1', grid: { x: 12, y: 0, w: 12, h: 6 } }] },
        logger,
      });

      expect(result.failures).toEqual([]);
      expect(getSection(result.dashboardData, 'section-a')?.panels).toEqual([
        expect.objectContaining({
          id: 'section-panel-1',
          grid: { x: 12, y: 0, w: 12, h: 6 },
          config: ESQL_METRIC_CONFIG,
        }),
      ]);
    });

    it('moves a top-level panel into a section', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [createLensPanel('top-1'), createSection('section-a', 'Section A', 10)],
        },
        upsert: { panels: [{ id: 'top-1', section: 'section-a' }] },
        logger,
      });

      expect(result.failures).toEqual([]);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(getSection(result.dashboardData, 'section-a')?.panels).toEqual([
        expect.objectContaining({
          id: 'top-1',
          type: LENS_EMBEDDABLE_TYPE,
          config: ESQL_METRIC_CONFIG,
        }),
      ]);
    });

    it('moves a section panel to the top level when section is null', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [
            createSection('section-a', 'Section A', 0, [createLensPanel('section-panel-1', 0)]),
          ],
        },
        upsert: { panels: [{ id: 'section-panel-1', section: null }] },
        logger,
      });

      expect(result.failures).toEqual([]);
      expect(getSection(result.dashboardData, 'section-a')?.panels).toEqual([]);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([
        expect.objectContaining({
          id: 'section-panel-1',
          type: LENS_EMBEDDABLE_TYPE,
          config: ESQL_METRIC_CONFIG,
        }),
      ]);
    });

    it('keeps a panel in place when it already is in the target section', async () => {
      const sectionPanel = createLensPanel('section-panel-1', 3);
      const dashboardData: DashboardAttachmentData = {
        title: 'Test dashboard',
        panels: [createSection('section-a', 'Section A', 0, [sectionPanel])],
      };

      const result = await executeDashboardUpsert({
        dashboardData,
        upsert: { panels: [{ id: 'section-panel-1', section: 'section-a' }] },
        logger,
      });

      expect(result.failures).toEqual([]);
      expect(result.dashboardData).toEqual(dashboardData);
    });

    it('records a failure when a panel without content does not exist', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        upsert: { panels: [{ id: 'missing-panel', grid: GRID }] },
        logger,
      });

      expect(result.dashboardData.panels).toEqual([]);
      expect(result.failures).toEqual([
        {
          type: UPSERT_FAILURE,
          identifier: 'missing-panel',
          error: 'Panel "missing-panel" does not exist. Provide content to create it.',
        },
      ]);
    });
  });

  describe('inline panel resolution', () => {
    it('creates inline visualization panels at the top level and inside sections', async () => {
      const resolvePanelContent = createResolverMock(
        createResolvePanelContent({
          'total-requests': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          'error-rate': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'bar' },
          }),
        })
      );

      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createSection('section-a', 'Section A', 0)],
        },
        upsert: {
          panels: [
            {
              id: 'total-requests',
              grid: GRID,
              content: {
                source: 'request',
                chartType: SupportedChartType.Metric,
                query: 'show total requests',
                index: 'logs-*',
              },
            },
            {
              id: 'error-rate',
              section: 'section-a',
              grid: GRID,
              content: metricRequest('show error rate'),
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'total-requests',
          nlQuery: 'show total requests',
          chartType: SupportedChartType.Metric,
          index: 'logs-*',
        })
      );
      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.not.objectContaining({ existingPanel: expect.anything() })
      );
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([
        expect.objectContaining({
          id: 'total-requests',
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
        }),
      ]);
      expect(getSection(result.dashboardData, 'section-a')?.panels).toEqual([
        expect.objectContaining({
          id: 'error-rate',
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'bar' },
        }),
      ]);
    });

    it('resolves inline panels across sections and the top level in parallel', async () => {
      const deferredByIdentifier = {
        'total-requests': createDeferred<PanelContentAttempt>(),
        'error-rate': createDeferred<PanelContentAttempt>(),
        'top-level': createDeferred<PanelContentAttempt>(),
      };
      const resolvePanelContent = createResolverMock(
        ({ identifier }) =>
          deferredByIdentifier[identifier as keyof typeof deferredByIdentifier].promise
      );

      const resultPromise = executeDashboardUpsert({
        dashboardData: {
          title: 'Test dashboard',
          description: 'Description',
          panels: [],
        },
        upsert: {
          sections: [
            { id: 'overview', title: 'Overview' },
            { id: 'errors', title: 'Errors' },
          ],
          panels: [
            {
              id: 'total-requests',
              grid: GRID,
              section: 'overview',
              content: metricRequest('show total requests'),
            },
            {
              id: 'error-rate',
              section: 'errors',
              grid: GRID,
              content: metricRequest('show error rate'),
            },
            { id: 'top-level', grid: GRID, content: metricRequest('show latency') },
          ],
        },
        logger,
        resolvePanelContent,
      });

      await waitForNextEventLoopTurn();

      expect(resolvePanelContent).toHaveBeenCalledTimes(3);
      expect(resolvePanelContent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ identifier: 'total-requests' })
      );
      expect(resolvePanelContent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ identifier: 'error-rate' })
      );
      expect(resolvePanelContent).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ identifier: 'top-level' })
      );

      deferredByIdentifier['top-level'].resolve(
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'line' } })
      );
      deferredByIdentifier['error-rate'].resolve(
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'bar' } })
      );
      deferredByIdentifier['total-requests'].resolve(
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric' } })
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
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([
        expect.objectContaining({ id: 'top-level', config: { type: 'line' } }),
      ]);
    });

    it('throws when request-source panels are present without a resolver', async () => {
      await expect(
        executeDashboardUpsert({
          dashboardData: {
            title: 'Test dashboard',
            description: 'Description',
            panels: [],
          },
          upsert: {
            sections: [{ id: 'overview', title: 'Overview' }],
            panels: [
              {
                id: 'total-requests',
                grid: GRID,
                section: 'overview',
                content: metricRequest('show total requests'),
              },
              { id: 'error-rate', grid: GRID, content: metricRequest('show error rate') },
            ],
          },
          logger,
        })
      ).rejects.toThrow('Inline panel resolver is required for request-source panels.');
    });

    it('throws when attachment-source panels are present without a resolver', async () => {
      await expect(
        executeDashboardUpsert({
          dashboardData: { title: 'Test', panels: [] },
          upsert: { panels: [{ id: 'metric', grid: GRID, content: metricAttachment }] },
          logger,
        })
      ).rejects.toThrow('Attachment panel resolver is required for attachment-source panels.');
    });

    it('edits inline visualization panels while preserving id and grid', async () => {
      const resolvePanelContent = createResolverMock(
        createResolvePanelContent({
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
        })
      );
      const topLevelPanel = createLensPanel('panel-1', 5);
      const sectionPanel = createLensPanel('section-panel-1', 0);

      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [topLevelPanel, createSection('section-a', 'Section A', 20, [sectionPanel])],
        },
        upsert: {
          panels: [
            {
              id: 'panel-1',
              content: { source: 'request', query: 'turn this into a bar chart' },
            },
            {
              id: 'section-panel-1',
              content: { source: 'request', query: 'turn this into a line chart' },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'panel-1',
          renderer: 'lens',
          nlQuery: 'turn this into a bar chart',
          existingPanel: topLevelPanel,
        })
      );
      expect(findPanel(result.dashboardData, 'panel-1')).toEqual({
        ...topLevelPanel,
        config: { type: 'bar' },
      });
      expect(getSection(result.dashboardData, 'section-a')?.panels).toEqual([
        { ...sectionPanel, config: { type: 'line' } },
      ]);
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
      expect(result.created).toEqual([]);
      expect(result.updated).toEqual(['panel-1', 'section-panel-1']);
    });

    it('edits and moves a panel in one item', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [createLensPanel('panel-1'), createSection('section-a', 'Section A', 10)],
        },
        upsert: {
          panels: [
            {
              id: 'panel-1',
              section: 'section-a',
              content: { source: 'request', query: 'make this a bar chart' },
            },
          ],
        },
        logger,
        resolvePanelContent: createResolvePanelContent({
          'panel-1': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'bar' },
          }),
        }),
      });

      expect(result.failures).toEqual([]);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(getSection(result.dashboardData, 'section-a')?.panels).toEqual([
        expect.objectContaining({ id: 'panel-1', config: { type: 'bar' } }),
      ]);
    });

    it('skips failed inline visualization resolutions and records the failure', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [],
        },
        upsert: {
          panels: [
            { id: 'total-requests', grid: GRID, content: metricRequest('show total requests') },
            { id: 'p95-latency', grid: GRID, content: metricRequest('show p95 latency') },
          ],
        },
        logger,
        resolvePanelContent: createResolvePanelContent({
          'total-requests': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          'p95-latency': createPanelFailureResult('p95-latency', 'ES|QL generation failed'),
        }),
      });

      expect(getIds(result.dashboardData.panels)).toEqual(['total-requests']);
      expect(result.failures).toEqual([
        {
          type: UPSERT_FAILURE,
          identifier: 'p95-latency',
          error: 'ES|QL generation failed',
        },
      ]);
    });

    it('keeps an existing panel unchanged when its edit fails to resolve', async () => {
      const panel = createLensPanel('panel-1');
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [panel, createSection('section-a', 'Section A', 10)],
        },
        upsert: {
          panels: [
            {
              id: 'panel-1',
              section: 'section-a',
              content: { source: 'request', query: 'make this a bar chart' },
            },
          ],
        },
        logger,
        resolvePanelContent: createResolvePanelContent({
          'panel-1': createPanelFailureResult('panel-1', 'ES|QL generation failed'),
        }),
      });

      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([panel]);
      expect(result.failures).toEqual([
        { type: UPSERT_FAILURE, identifier: 'panel-1', error: 'ES|QL generation failed' },
      ]);
      expect(result.updated).toEqual([]);
    });

    it('records a failure without calling the resolver when a request edit targets a panel with no renderer', async () => {
      const resolvePanelContent = createResolverMock();
      const panel: AttachmentPanel = {
        type: 'aiOpsLogRateAnalysis',
        id: 'panel-1',
        config: { seriesType: 'log_rate' },
        grid: { x: 0, y: 5, w: 24, h: 9 },
      };

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', description: 'Desc', panels: [panel] },
        upsert: {
          panels: [
            { id: 'panel-1', content: { source: 'request', query: 'refine this analysis' } },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(result.dashboardData.panels).toEqual([panel]);
      expect(result.failures).toEqual([
        {
          type: UPSERT_FAILURE,
          identifier: 'panel-1',
          error:
            'Panel "panel-1" with type "aiOpsLogRateAnalysis" is not supported for inline editing. To replace the panel with generated content, set `renderer` explicitly.',
        },
      ]);
    });

    describe('request edit renderer', () => {
      const editWith = async (existingPanel: AttachmentPanel, content: UpsertPanelContent) => {
        const resolvePanelContent = createResolverMock(async ({ renderer }) =>
          createResolvedPanelContent({
            type:
              renderer === 'custom_content'
                ? CUSTOM_CONTENT_EMBEDDABLE_TYPE
                : renderer === 'vega'
                ? VEGA_VIS_TYPE
                : LENS_EMBEDDABLE_TYPE,
            config: { updated: true },
          })
        );
        const result = await executeDashboardUpsert({
          dashboardData: { title: 'Test', panels: [existingPanel] },
          upsert: { panels: [{ id: existingPanel.id, content }] },
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
        const { result, resolvePanelContent } = await editWith(customContentPanel, {
          source: 'request',
          query: 'change the title',
        });

        expect(resolvePanelContent).not.toHaveBeenCalled();
        expect(result.dashboardData.panels).toEqual([customContentPanel]);
        expect(result.failures).toEqual([
          {
            type: UPSERT_FAILURE,
            identifier: 'cc-1',
            error:
              'Panel "cc-1" is a custom content panel. Edit it with source: "request", renderer: "custom_content". To replace the panel with generated content, set `renderer` explicitly.',
          },
        ]);
      });

      it('resolves a custom_content edit that names its renderer', async () => {
        const { result, resolvePanelContent } = await editWith(customContentPanel, {
          source: 'request',
          renderer: 'custom_content',
          query: 'change the title',
        });

        expect(resolvePanelContent).toHaveBeenCalledWith(
          expect.objectContaining({
            renderer: 'custom_content',
            nlQuery: 'change the title',
            existingPanel: customContentPanel,
          })
        );
        expect(result.failures).toEqual([]);
      });

      it('infers vega from the existing panel when renderer is omitted', async () => {
        const { result, resolvePanelContent } = await editWith(vegaPanel, {
          source: 'request',
          query: 'change the title',
        });

        expect(resolvePanelContent).toHaveBeenCalledWith(
          expect.objectContaining({ renderer: 'vega', existingPanel: vegaPanel })
        );
        expect(result.dashboardData.panels).toEqual([{ ...vegaPanel, config: { updated: true } }]);
      });

      it('replaces a Vega panel with a new Lens panel when the content names the lens renderer', async () => {
        const { result, resolvePanelContent } = await editWith(vegaPanel, {
          source: 'request',
          renderer: 'lens',
          chartType: SupportedChartType.XY,
          query: 'show requests per host',
        });

        expect(resolvePanelContent).toHaveBeenCalledWith(
          expect.objectContaining({ renderer: 'lens', identifier: 'vega-1' })
        );
        expect(resolvePanelContent).toHaveBeenCalledWith(
          expect.not.objectContaining({ existingPanel: expect.anything() })
        );
        expect(result.failures).toEqual([]);
        expect(result.dashboardData.panels).toEqual([
          expect.objectContaining({
            id: 'vega-1',
            type: LENS_EMBEDDABLE_TYPE,
            config: { updated: true },
          }),
        ]);
      });

      it('fails without calling the resolver when the lens renderer targets a Vega panel without a chart type', async () => {
        const { result, resolvePanelContent } = await editWith(vegaPanel, {
          source: 'request',
          renderer: 'lens',
          query: 'change the title',
        });

        expect(resolvePanelContent).not.toHaveBeenCalled();
        expect(result.dashboardData.panels).toEqual([vegaPanel]);
        expect(result.failures).toEqual([
          {
            type: UPSERT_FAILURE,
            identifier: 'vega-1',
            error: expect.stringContaining('Invalid content for panel "vega-1"'),
          },
        ]);
      });

      it('replaces a Lens panel with new custom content when the content names custom_content', async () => {
        const { result, resolvePanelContent } = await editWith(createLensPanel('panel-1'), {
          source: 'request',
          renderer: 'custom_content',
          query: 'show a KPI card',
        });

        expect(resolvePanelContent).toHaveBeenCalledWith({
          renderer: 'custom_content',
          identifier: 'panel-1',
          nlQuery: 'show a KPI card',
          esql: undefined,
        });
        expect(result.failures).toEqual([]);
        expect(result.dashboardData.panels).toEqual([
          expect.objectContaining({
            id: 'panel-1',
            type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
            config: { updated: true },
          }),
        ]);
      });

      it('fails without calling the resolver for a request without chart type on a by-value panel', async () => {
        const markdownPanel = createMarkdownPanel('md-1', 'old text');
        const { result, resolvePanelContent } = await editWith(markdownPanel, {
          source: 'request',
          query: 'change the title',
        });

        expect(resolvePanelContent).not.toHaveBeenCalled();
        expect(result.dashboardData.panels).toEqual([markdownPanel]);
        expect(result.failures).toEqual([
          {
            type: UPSERT_FAILURE,
            identifier: 'md-1',
            error:
              'Panel "md-1" is a markdown panel. Edit it with source: "config", type: "markdown". To replace the panel with generated content, set `renderer` explicitly.',
          },
        ]);
      });
    });

    it('resolves multiple panel edits in parallel', async () => {
      const deferredByPanelId = {
        'panel-1': createDeferred<PanelContentAttempt>(),
        'panel-2': createDeferred<PanelContentAttempt>(),
      };

      const resolvePanelContent = createResolverMock(({ identifier }) => {
        if (identifier !== 'panel-1' && identifier !== 'panel-2') {
          throw new Error(`Unexpected identifier "${identifier}" in test resolver`);
        }
        return deferredByPanelId[identifier].promise;
      });

      const upsertPromise = executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createLensPanel('panel-1', 0), createLensPanel('panel-2', 9)],
        },
        upsert: {
          panels: [
            {
              id: 'panel-1',
              content: {
                source: 'request',
                query: 'make this a bar chart',
                applyChartRules: true,
                preserveESQL: true,
              },
            },
            {
              id: 'panel-2',
              content: {
                source: 'request',
                query: 'make this a line chart',
                applyChartRules: true,
                preserveESQL: false,
              },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      // Gives the upsert a chance to start both parallel resolver calls.
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

      deferredByPanelId['panel-1'].resolve(
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'bar' } })
      );
      deferredByPanelId['panel-2'].resolve(
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'line' } })
      );

      const result = await upsertPromise;

      expect(findPanel(result.dashboardData, 'panel-1')).toEqual(
        expect.objectContaining({ config: { type: 'bar' } })
      );
      expect(findPanel(result.dashboardData, 'panel-2')).toEqual(
        expect.objectContaining({ config: { type: 'line' } })
      );
      expect(result.failures).toEqual([]);
    });

    it('records a failure for each occurrence when a panel id is duplicated within one call', async () => {
      const resolvePanelContent = createResolverMock(async ({ identifier }) =>
        createResolvedPanelContent({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'bar', identifier },
        })
      );

      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createLensPanel('panel-1', 0), createLensPanel('panel-2', 9)],
        },
        upsert: {
          panels: [
            { id: 'panel-1', content: { source: 'request', query: 'first edit' } },
            { id: 'panel-2', content: { source: 'request', query: 'edit a different panel' } },
            { id: 'panel-1', content: { source: 'request', query: 'second edit of same panel' } },
          ],
        },
        logger,
        resolvePanelContent,
      });

      const duplicateFailure = {
        type: UPSERT_FAILURE,
        identifier: 'panel-1',
        error: 'Panel "panel-1" appears more than once. List each panel once.',
      };

      expect(result.failures).toEqual([duplicateFailure, duplicateFailure]);

      // The duplicated panel must not be touched; the non-duplicated panel still resolves.
      expect(resolvePanelContent).toHaveBeenCalledTimes(1);
      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'panel-2' })
      );

      expect(findPanel(result.dashboardData, 'panel-1')).toEqual(
        expect.objectContaining({ config: ESQL_METRIC_CONFIG })
      );
      expect(findPanel(result.dashboardData, 'panel-2')).toEqual(
        expect.objectContaining({ config: { type: 'bar', identifier: 'panel-2' } })
      );
    });

    it('edits a markdown panel content in place', async () => {
      const resolvePanelContent = createResolverMock();
      const markdownPanel = createMarkdownPanel('md-1', 'old text');

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', description: 'Desc', panels: [markdownPanel] },
        upsert: { panels: [{ id: 'md-1', content: markdownContent('### Updated summary') }] },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(result.failures).toEqual([]);
      expect(result.dashboardData.panels).toEqual([
        {
          ...markdownPanel,
          config: { content: '### Updated summary', settings: { open_links_in_new_tab: true } },
        },
      ]);
    });

    it('edits an ML anomaly charts panel in place', async () => {
      const resolvePanelContent = createResolverMock();
      const chartsPanel = createAnomalyChartsPanel('charts-1');

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', description: 'Desc', panels: [chartsPanel] },
        upsert: {
          panels: [
            {
              id: 'charts-1',
              content: {
                source: 'config',
                type: 'ml_anomaly_charts',
                config: {
                  job_ids: ['job-1'],
                  title: 'Anomaly charts of job-1 with severity > 50',
                  severity_threshold: 50,
                },
              },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(result.failures).toEqual([]);
      expect(result.dashboardData.panels).toEqual([
        {
          ...chartsPanel,
          config: {
            job_ids: ['job-1'],
            title: 'Anomaly charts of job-1 with severity > 50',
            severity_threshold: [{ min: 50 }],
          },
        },
      ]);
    });

    it('edits an ML anomaly swimlane panel in place', async () => {
      const resolvePanelContent = createResolverMock();
      const swimlanePanel = createAnomalySwimlanePanel('swim-1');

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', description: 'Desc', panels: [swimlanePanel] },
        upsert: {
          panels: [
            {
              id: 'swim-1',
              content: {
                source: 'config',
                type: 'ml_anomaly_swimlane',
                config: {
                  job_ids: ['job-1'],
                  swimlane_type: 'overall',
                  severity_threshold: 75,
                  title: 'Overall anomalies of job-1 (high severity)',
                },
              },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(result.failures).toEqual([]);
      expect(result.dashboardData.panels).toEqual([
        {
          ...swimlanePanel,
          config: {
            job_ids: ['job-1'],
            swimlane_type: 'overall',
            severity_threshold: 75,
            title: 'Overall anomalies of job-1 (high severity)',
          },
        },
      ]);
    });

    it('edits an ML single metric viewer panel in place', async () => {
      const resolvePanelContent = createResolverMock();
      const singleMetricViewerPanel = createSingleMetricViewerPanel('smv-1');

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', description: 'Desc', panels: [singleMetricViewerPanel] },
        upsert: {
          panels: [
            {
              id: 'smv-1',
              content: {
                source: 'config',
                type: 'ml_single_metric_viewer',
                config: {
                  job_ids: ['job-1'],
                  selected_entities: { 'host.name': 'web-01' },
                  title: 'Metric viewer for web-01',
                },
              },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(result.failures).toEqual([]);
      expect(result.dashboardData.panels).toEqual([
        {
          ...singleMetricViewerPanel,
          config: {
            job_ids: ['job-1'],
            selected_entities: { 'host.name': 'web-01' },
            title: 'Metric viewer for web-01',
          },
        },
      ]);
    });

    it.each<[string, UpsertPanelContent, Pick<AttachmentPanel, 'type' | 'config'>]>([
      [
        'markdown',
        markdownContent('new text'),
        {
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: 'new text', settings: { open_links_in_new_tab: true } },
        },
      ],
      [
        'ML anomaly charts',
        { source: 'config', type: 'ml_anomaly_charts', config: { job_ids: ['job-1'] } },
        { type: 'ml_anomaly_charts', config: { job_ids: ['job-1'] } },
      ],
      [
        'ML anomaly swimlane',
        {
          source: 'config',
          type: 'ml_anomaly_swimlane',
          config: { job_ids: ['job-1'], swimlane_type: 'overall' },
        },
        { type: 'ml_anomaly_swimlane', config: { job_ids: ['job-1'], swimlane_type: 'overall' } },
      ],
      [
        'ML single metric viewer',
        { source: 'config', type: 'ml_single_metric_viewer', config: { job_ids: ['job-1'] } },
        { type: 'ml_single_metric_viewer', config: { job_ids: ['job-1'] } },
      ],
    ])(
      'replaces a Lens panel with %s config content and keeps its id',
      async (_, content, expectedContent) => {
        const resolvePanelContent = createResolverMock();

        const result = await executeDashboardUpsert({
          dashboardData: { title: 'Test', panels: [createLensPanel('panel-1', 0)] },
          upsert: { panels: [{ id: 'panel-1', content }] },
          logger,
          resolvePanelContent,
        });

        expect(resolvePanelContent).not.toHaveBeenCalled();
        expect(result.failures).toEqual([]);
        expect(result.dashboardData.panels).toEqual([
          expect.objectContaining({ id: 'panel-1', ...expectedContent }),
        ]);
      }
    );

    it('replaces a panel with attachment content and keeps its id', async () => {
      const resolveAttachmentPanel = jest.fn<PanelContentAttempt, [string]>(() => ({
        type: 'success',
        panelContent: { type: LENS_EMBEDDABLE_TYPE, config: { type: 'bar' } },
      }));

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [createLensPanel('panel-1')] },
        upsert: {
          panels: [{ id: 'panel-1', content: { source: 'attachment', attachment_id: 'a' } }],
        },
        logger,
        resolveAttachmentPanel,
      });

      expect(resolveAttachmentPanel).toHaveBeenCalledWith('a');
      expect(result.failures).toEqual([]);
      expect(result.dashboardData.panels).toEqual([
        expect.objectContaining({ id: 'panel-1', config: { type: 'bar' } }),
      ]);
    });

    it('routes custom_content edits through the panel resolver with the existing panel', async () => {
      const existingPanel: AttachmentPanel = {
        id: 'cc-1',
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: { esql_query: ['FROM logs | STATS count = COUNT(*)'], template: '<div>Old</div>' },
        grid: { x: 0, y: 0, w: 24, h: 6 },
      };
      const resolvePanelContent = createResolverMock(async () =>
        createResolvedPanelContent({
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: { template: '<div>Server generated</div>' },
        })
      );

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', description: 'Desc', panels: [existingPanel] },
        upsert: {
          panels: [
            {
              id: 'cc-1',
              content: {
                source: 'request',
                renderer: 'custom_content',
                query: 'updated prompt',
                esql: 'FROM logs | STATS count = COUNT(*)',
              },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).toHaveBeenCalledWith({
        renderer: 'custom_content',
        identifier: 'cc-1',
        nlQuery: 'updated prompt',
        esql: 'FROM logs | STATS count = COUNT(*)',
        existingPanel,
      });
      expect(result.failures).toEqual([]);
      expect(result.dashboardData.panels).toEqual([
        {
          ...existingPanel,
          config: { template: '<div>Server generated</div>' },
        },
      ]);
    });

    it('resolves custom_content and Lens edits in the same parallel phase', async () => {
      const deferredByIdentifier = {
        'cc-1': createDeferred<PanelContentAttempt>(),
        'panel-1': createDeferred<PanelContentAttempt>(),
      };
      const resolvePanelContent = createResolverMock(
        ({ identifier }) =>
          deferredByIdentifier[identifier as keyof typeof deferredByIdentifier].promise
      );

      const upsertPromise = executeDashboardUpsert({
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
        upsert: {
          panels: [
            {
              id: 'cc-1',
              content: { source: 'request', renderer: 'custom_content', query: 'add a border' },
            },
            { id: 'panel-1', content: { source: 'request', query: 'turn into a bar chart' } },
          ],
        },
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

      const result = await upsertPromise;
      expect(result.failures).toEqual([]);
      expect(getPanelsOnly(result.dashboardData.panels).map(({ config }) => config)).toEqual([
        { template: '<div>New</div>' },
        { type: 'bar' },
      ]);
    });

    it('mixes markdown and visualization edits, calling the resolver only for the visualization', async () => {
      const deferred = createDeferred<PanelContentAttempt>();
      const resolvePanelContent = createResolverMock(() => deferred.promise);

      const upsertPromise = executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          description: 'Desc',
          panels: [createMarkdownPanel('md-1', 'old text'), createLensPanel('panel-1', 5)],
        },
        upsert: {
          panels: [
            { id: 'md-1', content: markdownContent('### New summary') },
            { id: 'panel-1', content: { source: 'request', query: 'turn into a bar chart' } },
          ],
        },
        logger,
        resolvePanelContent,
      });

      // Gives the upsert a chance to subscribe to the visualization resolve.
      await waitForNextEventLoopTurn();

      expect(resolvePanelContent).toHaveBeenCalledTimes(1);
      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'panel-1' })
      );

      deferred.resolve(
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'bar' } })
      );

      const result = await upsertPromise;
      expect(result.failures).toEqual([]);
      expect(findPanel(result.dashboardData, 'md-1')).toEqual(
        expect.objectContaining({
          config: { content: '### New summary', settings: { open_links_in_new_tab: true } },
        })
      );
      expect(findPanel(result.dashboardData, 'panel-1')).toEqual(
        expect.objectContaining({ config: { type: 'bar' } })
      );
    });

    it('adds a custom_content panel through the panel resolver', async () => {
      const resolvePanelContent = createResolverMock(async () =>
        createResolvedPanelContent({
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: {
            esql_query: ['FROM logs-* | STATS error_rate = AVG(error) BY host'],
            template: '<div>KPI</div>',
          },
        })
      );

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', description: 'Desc', panels: [] },
        upsert: {
          panels: [
            {
              id: 'error-rate-kpi',
              grid: GRID,
              content: {
                source: 'request',
                renderer: 'custom_content',
                query: 'Show error rate KPI',
                esql: 'FROM logs-* | STATS error_rate = AVG(error) BY host',
              },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).toHaveBeenCalledWith({
        renderer: 'custom_content',
        identifier: 'error-rate-kpi',
        nlQuery: 'Show error rate KPI',
        esql: 'FROM logs-* | STATS error_rate = AVG(error) BY host',
      });
      expect(result.failures).toEqual([]);
      expect(result.dashboardData.panels).toEqual([
        expect.objectContaining({
          id: 'error-rate-kpi',
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: {
            esql_query: ['FROM logs-* | STATS error_rate = AVG(error) BY host'],
            template: '<div>KPI</div>',
          },
        }),
      ]);
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

    it('discards invalid panels after all changes and drops their authoring notes', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Dashboard', panels: [] },
        upsert: {
          panels: [
            { id: 'total-requests', grid: GRID, content: metricRequest('show total requests') },
            { id: 'p95-latency', grid: GRID, content: metricRequest('show p95 latency') },
          ],
        },
        logger,
        resolvePanelContent: createResolvePanelContent({
          'total-requests': createResolvedPanelContent(
            { type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric' } },
            'Created a metric showing total requests.'
          ),
          'p95-latency': createResolvedPanelContent(
            { type: LENS_EMBEDDABLE_TYPE, config: { type: 'metric', unrecognizedKey: true } },
            'Created a metric showing p95 latency.'
          ),
        }),
        validateDashboard,
      });

      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([
        expect.objectContaining({ id: 'total-requests', config: { type: 'metric' } }),
      ]);
      expect(result.failures).toEqual([
        expect.objectContaining({
          type: DASHBOARD_FAILURE_TYPES.validateDashboard,
          identifier: 'p95-latency',
          error: expect.stringContaining('Panel was not added'),
        }),
      ]);
      expect(result.panelAuthoringNotes).toEqual([
        { panelId: 'total-requests', authoringNote: 'Created a metric showing total requests.' },
      ]);
      expect(result.created).toEqual(['total-requests']);
    });

    it('validates what finalizeDashboard adds', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Dashboard', panels: [] },
        upsert: { title: 'Renamed' },
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
          type: DASHBOARD_FAILURE_TYPES.validateDashboard,
          identifier: 'time_range',
        }),
      ]);
    });

    it('runs finalizeDashboard before validation', async () => {
      const validatedDashboards: DashboardAttachmentData[] = [];

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Dashboard', panels: [] },
        upsert: { title: 'Renamed' },
        logger,
        finalizeDashboard: async (dashboardData) => ({
          ...dashboardData,
          time_range: { from: 'now-15m', to: 'now' },
        }),
        validateDashboard: (dashboardData) => {
          validatedDashboards.push(dashboardData);
          return [];
        },
      });

      expect(validatedDashboards).toEqual([
        expect.objectContaining({ title: 'Renamed', time_range: { from: 'now-15m', to: 'now' } }),
      ]);
      expect(result.failures).toEqual([]);
      expect(result.dashboardData.time_range).toEqual({ from: 'now-15m', to: 'now' });
    });
  });

  describe('schema', () => {
    it('accepts a markdown config-source panel with content and optional settings', () => {
      const result = upsertDashboardSchema.safeParse({
        panels: [
          {
            id: 'summary',
            content: {
              source: 'config',
              type: 'markdown',
              config: { content: '## Hi', settings: { open_links_in_new_tab: true } },
            },
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('rejects a markdown config-source panel whose config is missing content', () => {
      const result = upsertDashboardSchema.safeParse({
        panels: [
          {
            id: 'summary',
            content: {
              source: 'config',
              type: 'markdown',
              config: { settings: { open_links_in_new_tab: false } },
            },
          },
        ],
      });

      expect(result.success).toBe(false);
    });
  });
});

describe('executeDashboardUpsert controls', () => {
  const logger = createMockLogger();

  const emptyDashboard: DashboardAttachmentData = { title: 'Test', panels: [] };

  type ControlsInput = NonNullable<DashboardUpsert['controls']>;

  const addControls = (
    controls: ControlsInput,
    dashboardData: DashboardAttachmentData = emptyDashboard
  ) => executeDashboardUpsert({ dashboardData, upsert: { controls }, logger });

  const getControls = ({ pinned_panels: pinnedPanels = [] }: DashboardAttachmentData) =>
    pinnedPanels as unknown as Array<{
      id: string;
      type: string;
      width?: string;
      grow?: boolean;
      config: Record<string, unknown>;
    }>;

  it('appends an options_list_control with a server-built esql_query', async () => {
    const { dashboardData } = await addControls([
      {
        type: 'options_list_control',
        field_name: 'service.name',
        index: 'logs-*',
        title: 'Service',
      },
    ]);

    const controls = getControls(dashboardData);
    expect(controls).toHaveLength(1);
    const [control] = controls;
    expect(control.type).toBe('options_list_control');
    expect(typeof control.id).toBe('string');
    expect(control.width).toBe('medium');
    expect(control.grow).toBe(true);
    expect(control.config.values_source).toBe('esql');
    expect(control.config.esql_query).toBe('FROM logs-* | STATS BY `service.name`');
    expect(control.config.title).toBe('Service');
  });

  it('escapes ES|QL field identifiers in generated queries', async () => {
    const { dashboardData } = await addControls([
      { type: 'options_list_control', field_name: 'labels.pod-name', index: 'logs-*' },
      {
        type: 'range_slider_control',
        field_name: 'kubernetes.labels.app.kubernetes.io/name',
        index: 'logs-*',
      },
    ]);

    const controls = getControls(dashboardData);
    expect(controls[0].config.esql_query).toBe('FROM logs-* | STATS BY `labels.pod-name`');
    expect(controls[1].config.esql_query).toBe(
      'FROM logs-* | STATS BY `kubernetes.labels.app.kubernetes.io/name`'
    );
  });

  it('appends a range_slider_control', async () => {
    const { dashboardData } = await addControls([
      { type: 'range_slider_control', field_name: 'latency', index: 'metrics-*' },
    ]);

    const controls = getControls(dashboardData);
    expect(controls).toHaveLength(1);
    const [control] = controls;
    expect(control.type).toBe('range_slider_control');
    expect(control.config.values_source).toBe('esql');
    expect(control.config.esql_query).toBe('FROM metrics-* | STATS BY latency');
    expect(control.config.step).toBe(1);
  });

  it('appends a time_slider_control without esql_query', async () => {
    const { dashboardData } = await addControls([{ type: 'time_slider_control' }]);

    const controls = getControls(dashboardData);
    expect(controls).toHaveLength(1);
    const [control] = controls;
    expect(control.type).toBe('time_slider_control');
    expect(control.config).not.toHaveProperty('esql_query');
    expect(control.config).not.toHaveProperty('title');
    expect(control.config.start_percentage_of_time_range).toBe(0);
    expect(control.config.end_percentage_of_time_range).toBe(1);
  });

  it('skips extra time_slider_control controls in one call', async () => {
    const { dashboardData, failures } = await addControls([
      { type: 'time_slider_control' },
      { type: 'time_slider_control', user_requested: true },
      { type: 'options_list_control', field_name: 'service.name', index: 'logs-*' },
    ]);

    expect(getControls(dashboardData).map(({ type }) => type)).toEqual([
      'time_slider_control',
      'options_list_control',
    ]);
    expect(failures).toEqual([
      {
        type: UPSERT_FAILURE,
        identifier: 'controls[1]',
        error: 'A dashboard can contain at most one time_slider_control.',
      },
    ]);
  });

  it('silently skips an unrequested second time_slider_control on an existing dashboard', async () => {
    const { dashboardData: withTimeSlider } = await addControls([{ type: 'time_slider_control' }]);

    const { dashboardData, failures } = await addControls(
      [{ type: 'time_slider_control' }],
      withTimeSlider
    );

    expect(getControls(dashboardData)).toHaveLength(1);
    expect(failures).toEqual([]);
  });

  it('appends to existing controls', async () => {
    const { dashboardData: after1 } = await addControls([
      { type: 'options_list_control', field_name: 'host.name', index: 'logs-*' },
    ]);

    const { dashboardData: after2 } = await addControls(
      [{ type: 'options_list_control', field_name: 'env', index: 'logs-*' }],
      after1
    );

    expect(getControls(after2)).toHaveLength(2);
  });

  describe('field validation', () => {
    const index = 'kibana_sample_data_logs';

    const addValidatedControls = (
      controls: ControlsInput,
      resolveControlFieldCapabilities: ResolveControlFieldCapabilities,
      dashboardData: DashboardAttachmentData = emptyDashboard
    ) =>
      executeDashboardUpsert({
        dashboardData,
        upsert: { controls },
        logger,
        resolveControlFieldCapabilities,
      });

    const getEsqlQueries = ({ pinned_panels: pinnedPanels = [] }: DashboardAttachmentData) =>
      pinnedPanels.map(
        (panel) => (panel as unknown as { config: { esql_query?: string } }).config.esql_query
      );

    it('keeps controls on supported field types', async () => {
      const { dashboardData, failures } = await addValidatedControls(
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
      const { dashboardData, failures } = await addValidatedControls(
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
      const { dashboardData, failures } = await addValidatedControls(
        [{ type, field_name: 'field', index, user_requested: true }],
        createFieldCapabilitiesResolver(fields)
      );

      expect(getEsqlQueries(dashboardData)).toEqual([]);
      expect(failures).toEqual([{ type: UPSERT_FAILURE, identifier: 'field', error }]);
    });

    it('silently leaves out an unresolved control the user did not request', async () => {
      const { dashboardData, failures } = await addValidatedControls(
        [{ type: 'options_list_control', field_name: 'method', index }],
        createFieldCapabilitiesResolver({})
      );

      expect(getEsqlQueries(dashboardData)).toEqual([]);
      expect(failures).toEqual([]);
    });

    it('groups user-requested failures that share a reason', async () => {
      const { failures } = await addValidatedControls(
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
          type: UPSERT_FAILURE,
          identifier: 'http_method, status_code',
          error: notMapped,
        },
      ]);
    });

    it('requests only candidate fields, once per index, with the dashboard project routing', async () => {
      const resolveFieldCapabilities = createFieldCapabilitiesResolver({ host: usable('keyword') });

      await addValidatedControls(
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

      const { dashboardData, failures } = await addValidatedControls(
        [{ type: 'options_list_control', field_name: 'host', index, user_requested: true }],
        resolveFieldCapabilities
      );

      expect(failures).toEqual([]);
      expect(getEsqlQueries(dashboardData)).toEqual([`FROM ${index} | STATS BY host`]);
    });
  });

  it('removes controls by id and leaves others intact', async () => {
    const { dashboardData: withControls } = await addControls([
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
    ]);

    const controls = getControls(withControls);
    expect(controls).toHaveLength(2);
    const idToRemove = controls[0].id;

    const { dashboardData: afterRemove, failures } = await executeDashboardUpsert({
      dashboardData: withControls,
      upsert: { remove: [idToRemove] },
      logger,
    });

    expect(failures).toEqual([]);
    const remainingControls = getControls(afterRemove);
    expect(remainingControls).toHaveLength(1);
    expect(remainingControls[0].id).not.toBe(idToRemove);
    expect(remainingControls[0].config.title).toBe('Host');
  });

  it('records a failure and leaves controls unchanged when removing an unknown id', async () => {
    const { dashboardData: withControl } = await addControls([
      { type: 'options_list_control', field_name: 'env', index: 'logs-*' },
    ]);

    const { dashboardData: afterRemove, failures } = await executeDashboardUpsert({
      dashboardData: withControl,
      upsert: { remove: ['nonexistent-id'] },
      logger,
    });

    expect(afterRemove.pinned_panels).toEqual(withControl.pinned_panels);
    expect(failures).toEqual([
      {
        type: UPSERT_FAILURE,
        identifier: 'nonexistent-id',
        error: 'Nothing with id "nonexistent-id" exists on the dashboard.',
      },
    ]);
  });
});

describe('executeDashboardUpsert attachment-source panels', () => {
  const logger = createMockLogger();

  const attachmentContent = (attachmentId: string): UpsertPanelContent => ({
    source: 'attachment',
    attachment_id: attachmentId,
  });

  const lnsXYAttempt: PanelContentAttempt = {
    type: 'success',
    panelContent: { type: 'lens', config: { type: 'lnsXY' } },
  };

  // The point of the source: the model places a visualization it already created without
  // copying its payload back through the tool call.
  it('adds a panel from a visualization attachment without a config in the input', async () => {
    const resolveAttachmentPanel = jest.fn<PanelContentAttempt, [string]>(() => lnsXYAttempt);

    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Test dashboard', description: '', panels: [] },
      upsert: { panels: [{ id: 'chart', grid: GRID, content: attachmentContent('att-1') }] },
      logger,
      resolveAttachmentPanel,
    });

    expect(resolveAttachmentPanel).toHaveBeenCalledWith('att-1');
    expect(result.failures).toHaveLength(0);
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({ id: 'chart', type: 'lens', config: { type: 'lnsXY' } }),
    ]);
  });

  it('adds an attachment panel inside a new section', async () => {
    const resolveAttachmentPanel = jest.fn<PanelContentAttempt, [string]>(() => lnsXYAttempt);

    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Test dashboard', description: '', panels: [] },
      upsert: {
        sections: [{ id: 'overview', title: 'Overview' }],
        panels: [
          { id: 'chart', section: 'overview', grid: GRID, content: attachmentContent('att-1') },
        ],
      },
      logger,
      resolveAttachmentPanel,
    });

    expect(resolveAttachmentPanel).toHaveBeenCalledWith('att-1');
    expect(result.failures).toHaveLength(0);
    expect(getSections(result.dashboardData.panels)).toEqual([
      expect.objectContaining({
        id: 'overview',
        panels: [expect.objectContaining({ id: 'chart' })],
      }),
    ]);
  });

  it('keeps the section when an attachment inside it cannot be resolved', async () => {
    const resolveAttachmentPanel = jest.fn<PanelContentAttempt, [string]>(() =>
      createPanelFailureResult('att-missing', 'not found')
    );

    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Test dashboard', description: '', panels: [] },
      upsert: {
        sections: [{ id: 'overview', title: 'Overview' }],
        panels: [
          {
            id: 'chart',
            section: 'overview',
            grid: GRID,
            content: attachmentContent('att-missing'),
          },
        ],
      },
      logger,
      resolveAttachmentPanel,
    });

    expect(result.failures).toEqual([
      expect.objectContaining({ type: UPSERT_FAILURE, identifier: 'chart' }),
    ]);
    expect(getSections(result.dashboardData.panels)).toEqual([
      expect.objectContaining({ id: 'overview', panels: [] }),
    ]);
  });

  it('places the resolvable panels when one attachment in the batch fails', async () => {
    const resolveAttachmentPanel = jest.fn<PanelContentAttempt, [string]>((attachmentId) =>
      attachmentId === 'att-missing'
        ? createPanelFailureResult(attachmentId, 'not found')
        : lnsXYAttempt
    );

    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Test dashboard', description: '', panels: [] },
      upsert: {
        panels: [
          { id: 'chart', grid: GRID, content: attachmentContent('att-1') },
          { id: 'missing-chart', grid: GRID, content: attachmentContent('att-missing') },
        ],
      },
      logger,
      resolveAttachmentPanel,
    });

    expect(result.failures).toHaveLength(1);
    expect(getIds(result.dashboardData.panels)).toEqual(['chart']);
  });

  it('records a failure and skips the panel when the attachment cannot be resolved', async () => {
    const resolveAttachmentPanel = jest.fn<PanelContentAttempt, [string]>(() =>
      createPanelFailureResult('att-missing', 'not found')
    );

    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Test dashboard', description: '', panels: [] },
      upsert: { panels: [{ id: 'chart', grid: GRID, content: attachmentContent('att-missing') }] },
      logger,
      resolveAttachmentPanel,
    });

    expect(result.dashboardData.panels).toHaveLength(0);
    expect(result.failures).toEqual([
      expect.objectContaining({ identifier: 'chart', error: 'not found' }),
    ]);
  });
});
