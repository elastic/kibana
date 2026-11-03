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
import type { PanelResolutionRequest, ResolvePanelContent, UpsertPanelContent } from '../panels';
import type { PanelContentAttempt } from '../resolve_panel';
import { DASHBOARD_FAILURE_TYPES, type DashboardFailureKind } from '../failure_types';
import type { ControlFieldCapability, ResolveControlFieldCapabilities } from '../types';
import type { DashboardValidator } from '../validate_dashboard';
import { executeDashboardUpsert } from './upsert_dashboard';
import { upsertDashboardSchema, type DashboardUpsert } from './schema';

const UPSERT_FAILURE = DASHBOARD_FAILURE_TYPES.upsertDashboard;
const GRID = { x: 0, y: 0, w: 24, h: 9 };

const upsertFailure = (
  kind: DashboardFailureKind | undefined,
  identifier: string,
  error: string
) => ({
  type: UPSERT_FAILURE,
  kind,
  identifier,
  error,
});

const panelFailure = (identifier: string, error: string) =>
  upsertFailure('panel', identifier, error);

const sectionFailure = (identifier: string, error: string) =>
  upsertFailure('section', identifier, error);

const controlFailure = (identifier: string, error: string) =>
  upsertFailure('control', identifier, error);

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

const failedAttempt = (error: string): PanelContentAttempt => ({ type: 'failure', error });

describe('executeDashboardUpsert', () => {
  const logger = createMockLogger();
  const createLensPanel = (id: string, gridY = 0): AttachmentPanel => ({
    type: LENS_EMBEDDABLE_TYPE,
    id,
    config: ESQL_METRIC_CONFIG,
    grid: { x: 0, y: gridY, w: 24, h: 9 },
  });

  const createPanel = (
    id: string,
    type: string,
    config: AttachmentPanel['config']
  ): AttachmentPanel => ({ id, type, config, grid: GRID });

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

  /** Keys a resolution request by the panel it edits, or by its query for a new panel. */
  const getRequestKey = (request: PanelResolutionRequest): string =>
    request.existingPanel?.id ?? request.nlQuery ?? '';

  const createResolvePanelContent = (
    resultsByKey: Record<string, PanelContentAttempt> = {}
  ): ResolvePanelContent => {
    return async (request) =>
      resultsByKey[getRequestKey(request)] ??
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
          { id: 'metric', content: metricAttachment },
          { id: 'summary', content: markdownContent('### Updated summary') },
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
        panels: [{ id: 'summary', content: markdownContent('Hello') }],
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
        title: 'Test',
        panels: [],
      },
      upsert: {
        panels: [
          { id: 'metric-1', content: metricAttachment },
          { id: 'metric-2', content: metricAttachment },
          { id: 'metric-3', content: metricAttachment },
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
        title: 'Test',
        panels: [createSection('section-a', 'Section A', 8)],
      },
      upsert: {
        panels: [
          { id: 'summary', content: markdownContent('### Summary') },
          { id: 'section-metric', section: 'section-a', content: metricAttachment },
          { id: 'total-requests', content: metricRequest('show total requests') },
          { id: 'top-metric', content: metricAttachment },
          {
            id: 'p95-latency',
            section: 'section-a',
            content: metricRequest('show p95 latency'),
          },
        ],
      },
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
        'show p95 latency': failedAttempt('ES|QL generation failed'),
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
    expect(result.failures).toEqual([panelFailure('p95-latency', 'ES|QL generation failed')]);
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
            content: {
              source: 'config',
              type: 'ml_anomaly_charts',
              config: { job_ids: ['job-1'], severity_threshold: 50 },
            },
          },
          {
            id: 'swimlane',
            content: {
              source: 'config',
              type: 'ml_anomaly_swimlane',
              config: { job_ids: ['job-1'], swimlane_type: 'overall' },
            },
          },
          {
            id: 'smv',
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

  it('places new panels below existing panels, which keep their place, until the layout step', async () => {
    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Test', panels: [createLensPanel('existing', 0)] },
      upsert: {
        panels: [
          { id: 'beside', content: metricAttachment },
          { id: 'below', content: markdownContent('Notes') },
        ],
      },
      logger,
      resolveAttachmentPanel: resolveMetricAttachment,
    });

    expect(result.failures).toEqual([]);
    expect(findPanel(result.dashboardData, 'existing')?.grid).toEqual({ x: 0, y: 0, w: 24, h: 9 });
    expect(findPanel(result.dashboardData, 'beside')?.grid).toEqual({ x: 0, y: 9, w: 48, h: 10 });
    expect(findPanel(result.dashboardData, 'below')?.grid).toEqual({ x: 0, y: 19, w: 48, h: 10 });
  });

  describe('rejected changes', () => {
    const vegaPanel = createPanel('vega-1', VEGA_VIS_TYPE, { spec: '{}' });

    it.each<{
      name: string;
      panels: DashboardAttachmentData['panels'];
      upsert: DashboardUpsert;
      kind: DashboardFailureKind | undefined;
      identifier: string;
      error: string;
    }>([
      {
        name: 'a panel without content that does not exist',
        panels: [],
        upsert: { panels: [{ id: 'missing-panel' }] },
        kind: 'panel',
        identifier: 'missing-panel',
        error: 'Panel "missing-panel" does not exist. Provide content to create it.',
      },
      {
        name: 'a new section without title',
        panels: [],
        upsert: { sections: [{ id: 'overview' }] },
        kind: 'section',
        identifier: 'overview',
        error: 'Section "overview" does not exist. Provide a title to create it.',
      },
      {
        name: 'a new panel whose id is a uuid',
        panels: [createLensPanel('b6f1c2d4-8a3e-4f5b-9c7d-1e2f3a4b5c6d')],
        upsert: {
          panels: [
            { id: 'b6f1c2d4-8a3e-4f5b-9c7d-1e2f3a4b5c6e', content: markdownContent('Text') },
          ],
        },
        kind: 'panel',
        identifier: 'b6f1c2d4-8a3e-4f5b-9c7d-1e2f3a4b5c6e',
        error:
          'No panel has id "b6f1c2d4-8a3e-4f5b-9c7d-1e2f3a4b5c6e". Copy the id exactly from the dashboard to update the panel, or use a short readable id to create a new one.',
      },
      {
        name: 'a new section whose id is a uuid',
        panels: [],
        upsert: { sections: [{ id: '0d9e8f7a-6b5c-4d3e-8f1a-2b3c4d5e6f70', title: 'Overview' }] },
        kind: 'section',
        identifier: '0d9e8f7a-6b5c-4d3e-8f1a-2b3c4d5e6f70',
        error:
          'No section has id "0d9e8f7a-6b5c-4d3e-8f1a-2b3c4d5e6f70". Copy the id exactly from the dashboard to update the section, or use a short readable id to create a new one.',
      },
      {
        name: 'a section id that is already a panel id',
        panels: [createLensPanel('overview')],
        upsert: { sections: [{ id: 'overview', title: 'Overview' }] },
        kind: 'section',
        identifier: 'overview',
        error: '"overview" is a panel id. Use a different id for the section.',
      },
      {
        name: 'a panel id that is already a section id',
        panels: [createSection('overview', 'Overview', 0)],
        upsert: { panels: [{ id: 'overview', content: markdownContent('Text') }] },
        kind: 'panel',
        identifier: 'overview',
        error: '"overview" is a section id. Use a different id for the panel.',
      },
      {
        name: 'a panel in an unknown section',
        panels: [],
        upsert: {
          panels: [{ id: 'summary', section: 'missing', content: markdownContent('Text') }],
        },
        kind: 'panel',
        identifier: 'summary',
        error:
          'Section "missing" not found. Create it in `sections` or use an existing section id.',
      },
      {
        name: 'removing an id that does not exist',
        panels: [createLensPanel('panel-1')],
        upsert: { remove: ['missing'] },
        kind: undefined,
        identifier: 'missing',
        error: 'Nothing with id "missing" exists on the dashboard.',
      },
      {
        name: 'an id that is both updated and removed',
        panels: [createLensPanel('panel-1')],
        upsert: {
          panels: [{ id: 'panel-1', content: { source: 'request', query: 'make it a bar' } }],
          remove: ['panel-1'],
        },
        kind: 'panel',
        identifier: 'panel-1',
        error:
          '"panel-1" is both updated and removed in this call, so neither change was applied. Do only one.',
      },
      {
        name: 'a section that is both updated and removed',
        panels: [createSection('section-a', 'Section A', 0)],
        upsert: { sections: [{ id: 'section-a', title: 'Renamed' }], remove: ['section-a'] },
        kind: 'section',
        identifier: 'section-a',
        error:
          '"section-a" is both updated and removed in this call, so neither change was applied. Do only one.',
      },
      {
        name: 'a request edit of a panel type without a renderer',
        panels: [createPanel('panel-1', 'aiOpsLogRateAnalysis', { seriesType: 'log_rate' })],
        upsert: {
          panels: [{ id: 'panel-1', content: { source: 'request', query: 'refine this' } }],
        },
        kind: 'panel',
        identifier: 'panel-1',
        error:
          'Panel "panel-1" with type "aiOpsLogRateAnalysis" cannot be edited. Tell the user it cannot be edited, and replace it only after they confirm: then remove "panel-1" and add the new panel with a new id in the same call.',
      },
      {
        name: 'a custom_content request edit without renderer',
        panels: [createPanel('cc-1', CUSTOM_CONTENT_EMBEDDABLE_TYPE, { template: '<div />' })],
        upsert: {
          panels: [{ id: 'cc-1', content: { source: 'request', query: 'change the title' } }],
        },
        kind: 'panel',
        identifier: 'cc-1',
        error:
          'Panel "cc-1" is a custom_content panel. Edit it with source: "request", renderer: "custom_content". To replace it with another kind of panel, remove "cc-1" and add the new panel with a new id in the same call.',
      },
      {
        name: 'a markdown request edit without renderer',
        panels: [createPanel('md-1', MARKDOWN_EMBEDDABLE_TYPE, { content: 'old text' })],
        upsert: {
          panels: [{ id: 'md-1', content: { source: 'request', query: 'change the title' } }],
        },
        kind: 'panel',
        identifier: 'md-1',
        error:
          'Panel "md-1" is a markdown panel. Edit it with source: "config", type: "markdown". To replace it with another kind of panel, remove "md-1" and add the new panel with a new id in the same call.',
      },
      {
        name: 'a lens request on a Vega panel',
        panels: [vegaPanel],
        upsert: {
          panels: [
            {
              id: 'vega-1',
              content: { source: 'request', renderer: 'lens', query: 'show requests per host' },
            },
          ],
        },
        kind: 'panel',
        identifier: 'vega-1',
        error: `Panel "vega-1" is a vega panel. Edit it with source: "request", renderer: "vega". To replace it with another kind of panel, remove "vega-1" and add the new panel with a new id in the same call.`,
      },
      {
        name: 'a custom_content request on a Lens panel',
        panels: [createLensPanel('panel-1')],
        upsert: {
          panels: [
            {
              id: 'panel-1',
              content: { source: 'request', renderer: 'custom_content', query: 'show a KPI card' },
            },
          ],
        },
        kind: 'panel',
        identifier: 'panel-1',
        error: `Panel "panel-1" is a lens panel. Edit it with source: "request", renderer: "lens". To replace it with another kind of panel, remove "panel-1" and add the new panel with a new id in the same call.`,
      },
      {
        name: 'a request edit of a Lens panel not backed by ES|QL',
        panels: [createPanel('panel-1', LENS_EMBEDDABLE_TYPE, { type: 'metric' })],
        upsert: {
          panels: [{ id: 'panel-1', content: { source: 'request', query: 'make it a bar' } }],
        },
        kind: 'panel',
        identifier: 'panel-1',
        error: `Panel "panel-1" is a Lens panel that is not backed by ES|QL, so it cannot be edited. Tell the user it cannot be edited, and replace it only after they confirm: then remove "panel-1" and add the new panel with a new id in the same call.`,
      },
      {
        name: 'markdown content on a Lens panel',
        panels: [createLensPanel('panel-1')],
        upsert: { panels: [{ id: 'panel-1', content: markdownContent('Text') }] },
        kind: 'panel',
        identifier: 'panel-1',
        error:
          'Panel "panel-1" is a lens panel. Edit it with source: "request", renderer: "lens". To replace it with another kind of panel, remove "panel-1" and add the new panel with a new id in the same call.',
      },
      {
        name: 'a new Lens panel without chartType',
        panels: [],
        upsert: {
          panels: [{ id: 'trend', content: { source: 'request', query: 'show trend' } }],
        },
        kind: 'panel',
        identifier: 'trend',
        error: 'Panel "trend" is new. Provide `chartType` to create a Lens panel.',
      },
      {
        name: 'a new custom_content panel without query',
        panels: [],
        upsert: {
          panels: [
            {
              id: 'kpi',
              content: {
                source: 'request',
                renderer: 'custom_content',
                esql: 'FROM logs',
                hasData: true,
              },
            },
          ],
        },
        kind: 'panel',
        identifier: 'kpi',
        error: 'Panel "kpi" is new. Provide `query` to create it.',
      },
      {
        name: 'a custom_content edit with nothing to change',
        panels: [createPanel('cc-1', CUSTOM_CONTENT_EMBEDDABLE_TYPE, { template: '<div />' })],
        upsert: {
          panels: [{ id: 'cc-1', content: { source: 'request', renderer: 'custom_content' } }],
        },
        kind: 'panel',
        identifier: 'cc-1',
        error:
          'Panel "cc-1" edit needs `query` unless it only replaces the ES|QL query with a non-blank `esql` or removes it (`esql`: null, or `hasData`: false); `regenerateESQL` and `hasData`: true need it.',
      },
      {
        name: 'a custom_content edit whose only change is a blank esql',
        panels: [createPanel('cc-1', CUSTOM_CONTENT_EMBEDDABLE_TYPE, { template: '<div />' })],
        upsert: {
          panels: [
            {
              id: 'cc-1',
              content: { source: 'request', renderer: 'custom_content', esql: '  ' },
            },
          ],
        },
        kind: 'panel',
        identifier: 'cc-1',
        error:
          'Panel "cc-1" edit needs `query` unless it only replaces the ES|QL query with a non-blank `esql` or removes it (`esql`: null, or `hasData`: false); `regenerateESQL` and `hasData`: true need it.',
      },
      {
        name: 'a custom_content edit that regenerates the query without a query',
        panels: [createPanel('cc-1', CUSTOM_CONTENT_EMBEDDABLE_TYPE, { template: '<div />' })],
        upsert: {
          panels: [
            {
              id: 'cc-1',
              content: { source: 'request', renderer: 'custom_content', regenerateESQL: true },
            },
          ],
        },
        kind: 'panel',
        identifier: 'cc-1',
        error:
          'Panel "cc-1" edit needs `query` unless it only replaces the ES|QL query with a non-blank `esql` or removes it (`esql`: null, or `hasData`: false); `regenerateESQL` and `hasData`: true need it.',
      },
      {
        name: 'a custom_content edit that regenerates and removes the query',
        panels: [createPanel('cc-1', CUSTOM_CONTENT_EMBEDDABLE_TYPE, { template: '<div />' })],
        upsert: {
          panels: [
            {
              id: 'cc-1',
              content: {
                source: 'request',
                renderer: 'custom_content',
                query: 'show errors by host',
                regenerateESQL: true,
                hasData: false,
              },
            },
          ],
        },
        kind: 'panel',
        identifier: 'cc-1',
        error:
          'Panel "cc-1" cannot combine `regenerateESQL` with `hasData`: false, which removes the query.',
      },
      {
        name: 'a new custom_content panel without hasData',
        panels: [],
        upsert: {
          panels: [
            {
              id: 'kpi',
              content: { source: 'request', renderer: 'custom_content', query: 'show a KPI card' },
            },
          ],
        },
        kind: 'panel',
        identifier: 'kpi',
        error:
          'Panel "kpi" is new. Provide `hasData` (true to generate its ES|QL query, false for static content with no query) to create it.',
      },
      {
        name: 'a new custom_content panel without query and hasData',
        panels: [],
        upsert: {
          panels: [{ id: 'kpi', content: { source: 'request', renderer: 'custom_content' } }],
        },
        kind: 'panel',
        identifier: 'kpi',
        error:
          'Panel "kpi" is new. Provide `query` and `hasData` (true to generate its ES|QL query, false for static content with no query) to create it.',
      },
      {
        name: 'a custom_content edit that removes the query and asks for one',
        panels: [createPanel('cc-1', CUSTOM_CONTENT_EMBEDDABLE_TYPE, { template: '<div />' })],
        upsert: {
          panels: [
            {
              id: 'cc-1',
              content: {
                source: 'request',
                renderer: 'custom_content',
                query: 'show errors by host',
                esql: null,
                hasData: true,
              },
            },
          ],
        },
        kind: 'panel',
        identifier: 'cc-1',
        error:
          'Panel "cc-1" cannot combine `esql`: null, which removes the query, with `hasData`: true or `regenerateESQL`.',
      },
      {
        name: 'a custom_content edit that removes the query and regenerates it',
        panels: [createPanel('cc-1', CUSTOM_CONTENT_EMBEDDABLE_TYPE, { template: '<div />' })],
        upsert: {
          panels: [
            {
              id: 'cc-1',
              content: {
                source: 'request',
                renderer: 'custom_content',
                query: 'show errors by host',
                esql: null,
                regenerateESQL: true,
              },
            },
          ],
        },
        kind: 'panel',
        identifier: 'cc-1',
        error:
          'Panel "cc-1" cannot combine `esql`: null, which removes the query, with `hasData`: true or `regenerateESQL`.',
      },
      {
        name: 'a new custom_content panel with regenerateESQL',
        panels: [],
        upsert: {
          panels: [
            {
              id: 'kpi',
              content: {
                source: 'request',
                renderer: 'custom_content',
                query: 'show a KPI card',
                hasData: true,
                regenerateESQL: true,
              },
            },
          ],
        },
        kind: 'panel',
        identifier: 'kpi',
        error:
          'Panel "kpi" is new, so `regenerateESQL` does not apply. Use `hasData` to say whether it has a query.',
      },
      {
        name: 'attachment content on an existing panel',
        panels: [createLensPanel('panel-1')],
        upsert: {
          panels: [{ id: 'panel-1', content: { source: 'attachment', attachment_id: 'a' } }],
        },
        kind: 'panel',
        identifier: 'panel-1',
        error: `Panel "panel-1" already exists, and attachments only add new panels. To replace it with the attachment, remove "panel-1" and add the attachment with a new id in the same call.`,
      },
    ])(
      'rejects $name and leaves the dashboard unchanged',
      async ({ panels, upsert, kind, identifier, error }) => {
        const resolvePanelContent = createResolverMock();
        const resolveAttachmentPanel = jest.fn<PanelContentAttempt, [string]>(
          resolveMetricAttachment
        );

        const result = await executeDashboardUpsert({
          dashboardData: { title: 'Test', panels },
          upsert,
          logger,
          resolvePanelContent,
          resolveAttachmentPanel,
        });

        expect(resolvePanelContent).not.toHaveBeenCalled();
        expect(resolveAttachmentPanel).not.toHaveBeenCalled();
        expect(result.dashboardData.panels).toEqual(panels);
        expect(result.failures).toEqual([upsertFailure(kind, identifier, error)]);
      }
    );

    it('edits an existing panel whose id is a uuid', async () => {
      const id = 'b6f1c2d4-8a3e-4f5b-9c7d-1e2f3a4b5c6d';
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [createPanel(id, MARKDOWN_EMBEDDABLE_TYPE, { content: 'Old' })],
        },
        upsert: { panels: [{ id, content: markdownContent('New') }] },
        logger,
      });

      expect(result.failures).toEqual([]);
      expect(result.updated).toEqual([id]);
    });

    it('removes a section when a new panel reuses its id', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [createSection('latency', 'Latency', 0)] },
        upsert: {
          panels: [{ id: 'latency', content: markdownContent('Text') }],
          remove: ['latency'],
        },
        logger,
      });

      expect(result.dashboardData.panels).toEqual([]);
      expect(result.failures).toEqual([
        panelFailure('latency', '"latency" is a section id. Use a different id for the panel.'),
      ]);
    });
  });

  describe('sections', () => {
    it('adds an empty section with the given id and default collapsed=false', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
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

    it('records one failure for a duplicated section id', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [] },
        upsert: {
          sections: [
            { id: 'overview', title: 'Overview' },
            { id: 'overview', title: 'Another overview' },
          ],
          panels: [{ id: 'summary', section: 'overview', content: markdownContent('Text') }],
        },
        logger,
      });

      expect(result.dashboardData.panels).toEqual([]);
      expect(result.failures).toEqual([
        sectionFailure(
          'overview',
          'Section "overview" appears more than once. List each section once.'
        ),
        panelFailure(
          'summary',
          'Section "overview" was not created (see its failure), so panel "summary" cannot be placed in it.'
        ),
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
          { id: 'nested-panel', section: 'details' },
          { id: 'summary', section: 'overview', content: markdownContent('Summary') },
          {
            id: 'total-requests',
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
          grid: { x: 0, y: 0, w: 24, h: 9 },
        }),
        expect.objectContaining({
          id: 'total-requests',
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'metric' },
        }),
      ]);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect([...result.created].sort()).toEqual([
        'details',
        'overview',
        'summary',
        'total-requests',
      ]);
      expect(result.updated).toEqual(['top-panel', 'nested-panel']);
      expect({ dashboardData, upsert }).toEqual(originalInputs);
    });

    it('adds non-visualization section panels without invoking the panel resolver', async () => {
      const resolvePanelContent = createResolverMock();

      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [],
        },
        upsert: {
          sections: [{ id: 'overview', title: 'Overview' }],
          panels: [
            {
              id: 'summary',
              section: 'overview',
              content: markdownContent('### Section Summary'),
            },
            { id: 'metric', section: 'overview', content: metricAttachment },
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

    it('removes a section together with the panels it contains', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
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
      expect(result.removed).toEqual(['section-a-1', 'section-a']);
    });

    it('keeps panels moved out of a section that is removed in the same call', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
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

    it('keeps a section when a panel listed to move out of it cannot be moved', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [
            createLensPanel('top-1', 0),
            createSection('section-a', 'Section A', 10, [createLensPanel('section-a-1', 0)]),
          ],
        },
        upsert: {
          panels: [{ id: 'section-a-1', section: 'missing-section' }],
          remove: ['section-a'],
        },
        logger,
      });

      expect(getSections(result.dashboardData.panels)).toEqual([
        expect.objectContaining({
          id: 'section-a',
          panels: [expect.objectContaining({ id: 'section-a-1' })],
        }),
      ]);
      expect(result.failures).toEqual([
        expect.objectContaining({ identifier: 'section-a-1' }),
        sectionFailure(
          'section-a',
          'Section "section-a" was not removed because removing it would also delete "section-a-1", whose change in this call was not applied (see their failures). Fix those panels and remove the section again.'
        ),
      ]);
    });

    it('keeps a section when a panel moved out of it is listed twice', async () => {
      const panel = createLensPanel('panel-1');
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [createSection('section-a', 'Section A', 0, [panel])],
        },
        upsert: {
          panels: [
            { id: 'panel-1', section: null },
            { id: 'panel-1', content: metricRequest('apply presentation defaults') },
          ],
          remove: ['section-a'],
        },
        logger,
        resolvePanelContent: createResolverMock(),
      });

      expect(result.dashboardData.panels).toEqual([
        createSection('section-a', 'Section A', 0, [panel]),
      ]);
      expect(result.failures).toEqual([
        panelFailure(
          'panel-1',
          'Panel "panel-1" appears more than once. List each panel once, with its `section` and `content` in the same item.'
        ),
        sectionFailure(
          'section-a',
          'Section "section-a" was not removed because removing it would also delete "panel-1", whose change in this call was not applied (see their failures). Fix those panels and remove the section again.'
        ),
      ]);
    });

    it('names a panel that cannot leave a removed section once', async () => {
      const panel = createLensPanel('panel-1');
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [createSection('section-a', 'Section A', 0, [panel])],
        },
        upsert: {
          panels: [
            { id: 'panel-1', section: null },
            { id: 'panel-1', section: null },
          ],
          remove: ['section-a'],
        },
        logger,
      });

      expect(result.dashboardData.panels).toEqual([
        createSection('section-a', 'Section A', 0, [panel]),
      ]);
      expect(result.failures).toEqual([
        panelFailure(
          'panel-1',
          'Panel "panel-1" appears more than once. List each panel once, with its `section` and `content` in the same item.'
        ),
        sectionFailure(
          'section-a',
          'Section "section-a" was not removed because removing it would also delete "panel-1", whose change in this call was not applied (see their failures). Fix those panels and remove the section again.'
        ),
      ]);
    });

    it('keeps a removed section when a panel in it is moved into another removed section', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [
            createSection('section-a', 'Section A', 0, [createLensPanel('section-a-1', 0)]),
            createSection('section-b', 'Section B', 10, [createLensPanel('section-b-1', 0)]),
          ],
        },
        upsert: {
          panels: [{ id: 'section-a-1', section: 'section-b' }],
          remove: ['section-a', 'section-b'],
        },
        logger,
      });

      expect(getIds(result.dashboardData.panels)).toEqual(['section-a']);
      expect(getSection(result.dashboardData, 'section-a')?.panels).toEqual([
        expect.objectContaining({ id: 'section-a-1' }),
      ]);
      expect(result.failures).toEqual([
        panelFailure(
          'section-a-1',
          'Section "section-b" is listed in `remove`, so panels cannot move into it. Place panel "section-a-1" in a section that stays, or keep the section.'
        ),
        sectionFailure(
          'section-a',
          'Section "section-a" was not removed because removing it would also delete "section-a-1", whose change in this call was not applied (see their failures). Fix those panels and remove the section again.'
        ),
      ]);
    });

    it('edits a panel in a section that is kept because another panel could not move out', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [
            createSection('section-a', 'Section A', 0, [
              createLensPanel('section-a-1', 0),
              createPanel('notes', MARKDOWN_EMBEDDABLE_TYPE, { content: 'Old' }),
            ]),
          ],
        },
        upsert: {
          panels: [
            { id: 'section-a-1', section: 'missing-section' },
            { id: 'notes', content: markdownContent('New') },
          ],
          remove: ['section-a'],
        },
        logger,
      });

      expect(getSection(result.dashboardData, 'section-a')).toBeDefined();
      expect(findPanel(result.dashboardData, 'notes')?.config).toEqual({
        content: 'New',
        settings: { open_links_in_new_tab: true },
      });
      expect(result.failures.map(({ identifier }) => identifier)).toEqual([
        'section-a-1',
        'section-a',
      ]);
      expect(result.updated).toEqual(['notes']);
    });

    it('removes a panel listed to stay in its section when that section is removed', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [
            createLensPanel('top-1', 0),
            createSection('section-a', 'Section A', 10, [createLensPanel('section-a-1', 0)]),
          ],
        },
        upsert: {
          panels: [{ id: 'section-a-1', section: 'section-a' }],
          remove: ['section-a'],
        },
        logger,
      });

      expect(getSections(result.dashboardData.panels)).toHaveLength(0);
      expect(getIds(result.dashboardData.panels)).toEqual(['top-1']);
      expect(result.failures).toEqual([
        panelFailure(
          'section-a-1',
          'Panel "section-a-1" is in section "section-a", which is removed in this call, so the panel is removed with it. To keep the panel, move it out with `section`.'
        ),
      ]);
    });

    it('rejects panels placed into a section that is removed in the same call', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
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
        panelFailure(
          'top-1',
          'Section "section-a" is listed in `remove`, so panels cannot move into it. Place panel "top-1" in a section that stays, or keep the section.'
        ),
      ]);
    });
  });

  describe('removals', () => {
    it('removes matching panel ids from top-level and section panels', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
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
  });

  describe('moving and resizing panels', () => {
    it('moves a top-level panel into a section', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
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
          title: 'Test',
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
  });

  describe('inline panel resolution', () => {
    it('creates inline visualization panels at the top level and inside sections', async () => {
      const resolvePanelContent = createResolverMock(
        createResolvePanelContent({
          'show total requests': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          'show error rate': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'bar' },
          }),
        })
      );

      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [createSection('section-a', 'Section A', 0)],
        },
        upsert: {
          panels: [
            {
              id: 'total-requests',
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
              content: metricRequest('show error rate'),
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({
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
      const deferredByQuery = {
        'show total requests': createDeferred<PanelContentAttempt>(),
        'show error rate': createDeferred<PanelContentAttempt>(),
        'show latency': createDeferred<PanelContentAttempt>(),
      };
      const resolvePanelContent = createResolverMock(
        (request) => deferredByQuery[getRequestKey(request) as keyof typeof deferredByQuery].promise
      );

      const resultPromise = executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
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
              section: 'overview',
              content: metricRequest('show total requests'),
            },
            {
              id: 'error-rate',
              section: 'errors',
              content: metricRequest('show error rate'),
            },
            { id: 'top-level', content: metricRequest('show latency') },
          ],
        },
        logger,
        resolvePanelContent,
      });

      await waitForNextEventLoopTurn();

      expect(resolvePanelContent).toHaveBeenCalledTimes(3);
      expect(resolvePanelContent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ nlQuery: 'show total requests' })
      );
      expect(resolvePanelContent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ nlQuery: 'show error rate' })
      );
      expect(resolvePanelContent).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ nlQuery: 'show latency' })
      );

      deferredByQuery['show latency'].resolve(
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'line' } })
      );
      deferredByQuery['show error rate'].resolve(
        createResolvedPanelContent({ type: LENS_EMBEDDABLE_TYPE, config: { type: 'bar' } })
      );
      deferredByQuery['show total requests'].resolve(
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
            title: 'Test',
            panels: [],
          },
          upsert: {
            sections: [{ id: 'overview', title: 'Overview' }],
            panels: [
              {
                id: 'total-requests',
                section: 'overview',
                content: metricRequest('show total requests'),
              },
              { id: 'error-rate', content: metricRequest('show error rate') },
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
          upsert: { panels: [{ id: 'metric', content: metricAttachment }] },
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
          panels: [],
        },
        upsert: {
          panels: [
            { id: 'total-requests', content: metricRequest('show total requests') },
            { id: 'p95-latency', content: metricRequest('show p95 latency') },
          ],
        },
        logger,
        resolvePanelContent: createResolvePanelContent({
          'show total requests': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric' },
          }),
          'show p95 latency': failedAttempt('ES|QL generation failed'),
        }),
      });

      expect(getIds(result.dashboardData.panels)).toEqual(['total-requests']);
      expect(result.failures).toEqual([panelFailure('p95-latency', 'ES|QL generation failed')]);
    });

    it('still moves an existing panel when its edit fails to resolve', async () => {
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
          'panel-1': failedAttempt('ES|QL generation failed'),
        }),
      });

      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([]);
      expect(getSections(result.dashboardData.panels)).toEqual([
        expect.objectContaining({
          id: 'section-a',
          panels: [expect.objectContaining({ id: 'panel-1', config: panel.config })],
        }),
      ]);
      expect(result.failures).toEqual([panelFailure('panel-1', 'ES|QL generation failed')]);
      expect(result.updated).toEqual(['panel-1']);
    });

    it('still moves a panel out of a removed section when its edit is rejected', async () => {
      const panel = createLensPanel('panel-1');
      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
          panels: [createSection('section-a', 'Section A', 0, [panel])],
        },
        upsert: {
          panels: [{ id: 'panel-1', section: null, content: markdownContent('Text') }],
          remove: ['section-a'],
        },
        logger,
      });

      expect(getSections(result.dashboardData.panels)).toEqual([]);
      expect(getPanelsOnly(result.dashboardData.panels)).toEqual([
        expect.objectContaining({ id: 'panel-1', config: panel.config }),
      ]);
      expect(result.failures).toEqual([
        panelFailure(
          'panel-1',
          'Panel "panel-1" is a lens panel. Edit it with source: "request", renderer: "lens". To replace it with another kind of panel, remove "panel-1" and add the new panel with a new id in the same call.'
        ),
      ]);
      expect(result.updated).toEqual(['panel-1']);
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

      const vegaPanel = createPanel('vega-1', VEGA_VIS_TYPE, { spec: '{}' });

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

      it('drops applyChartRules when renderer is omitted on a vega panel', async () => {
        const { result, resolvePanelContent } = await editWith(vegaPanel, {
          source: 'request',
          query: 'change the title',
          applyChartRules: true,
        });

        expect(resolvePanelContent).toHaveBeenCalledWith(
          expect.objectContaining({ renderer: 'vega', applyChartRules: undefined })
        );
        expect(result.failures).toEqual([]);
      });
    });

    it('resolves multiple panel edits in parallel', async () => {
      const deferredByPanelId = {
        'panel-1': createDeferred<PanelContentAttempt>(),
        'panel-2': createDeferred<PanelContentAttempt>(),
      };

      const resolvePanelContent = createResolverMock((request) => {
        const panelId = getRequestKey(request);
        if (panelId !== 'panel-1' && panelId !== 'panel-2') {
          throw new Error(`Unexpected panel "${panelId}" in test resolver`);
        }
        return deferredByPanelId[panelId].promise;
      });

      const upsertPromise = executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
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
          existingPanel: expect.objectContaining({ id: 'panel-1' }),
          applyChartRules: true,
          preserveESQL: true,
        })
      );
      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({
          existingPanel: expect.objectContaining({ id: 'panel-2' }),
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

    it('records one failure when a panel id is duplicated within one call', async () => {
      const resolvePanelContent = createResolverMock(async (request) =>
        createResolvedPanelContent({
          type: LENS_EMBEDDABLE_TYPE,
          config: { type: 'bar', panelId: getRequestKey(request) },
        })
      );

      const result = await executeDashboardUpsert({
        dashboardData: {
          title: 'Test',
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

      const duplicateFailure = panelFailure(
        'panel-1',
        'Panel "panel-1" appears more than once. List each panel once, with its `section` and `content` in the same item.'
      );

      expect(result.failures).toEqual([duplicateFailure]);

      // The duplicated panel must not be touched; the non-duplicated panel still resolves.
      expect(resolvePanelContent).toHaveBeenCalledTimes(1);
      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({ existingPanel: expect.objectContaining({ id: 'panel-2' }) })
      );

      expect(findPanel(result.dashboardData, 'panel-1')).toEqual(
        expect.objectContaining({ config: ESQL_METRIC_CONFIG })
      );
      expect(findPanel(result.dashboardData, 'panel-2')).toEqual(
        expect.objectContaining({ config: { type: 'bar', panelId: 'panel-2' } })
      );
    });

    it.each<{
      name: string;
      existingPanel: AttachmentPanel;
      content: UpsertPanelContent;
      expected: Pick<AttachmentPanel, 'type' | 'config'>;
    }>([
      {
        name: 'markdown content on a markdown panel',
        existingPanel: createPanel('panel-1', MARKDOWN_EMBEDDABLE_TYPE, { content: 'old' }),
        content: markdownContent('new text'),
        expected: {
          type: MARKDOWN_EMBEDDABLE_TYPE,
          config: { content: 'new text', settings: { open_links_in_new_tab: true } },
        },
      },
      {
        name: 'ML anomaly charts content on an anomaly charts panel',
        existingPanel: createPanel('panel-1', 'ml_anomaly_charts', { job_ids: ['job-1'] }),
        content: {
          source: 'config',
          type: 'ml_anomaly_charts',
          config: { job_ids: ['job-1'], title: 'Severe anomalies', severity_threshold: 50 },
        },
        expected: {
          type: 'ml_anomaly_charts',
          config: {
            job_ids: ['job-1'],
            title: 'Severe anomalies',
            severity_threshold: [{ min: 50 }],
          },
        },
      },
      {
        name: 'ML anomaly swimlane content on an anomaly swimlane panel',
        existingPanel: createPanel('panel-1', 'ml_anomaly_swimlane', { job_ids: ['job-1'] }),
        content: {
          source: 'config',
          type: 'ml_anomaly_swimlane',
          config: { job_ids: ['job-1'], swimlane_type: 'overall', severity_threshold: 75 },
        },
        expected: {
          type: 'ml_anomaly_swimlane',
          config: { job_ids: ['job-1'], swimlane_type: 'overall', severity_threshold: 75 },
        },
      },
      {
        name: 'ML single metric viewer content on a single metric viewer panel',
        existingPanel: createPanel('panel-1', 'ml_single_metric_viewer', { job_ids: ['job-1'] }),
        content: {
          source: 'config',
          type: 'ml_single_metric_viewer',
          config: { job_ids: ['job-1'], selected_entities: { 'host.name': 'web-01' } },
        },
        expected: {
          type: 'ml_single_metric_viewer',
          config: { job_ids: ['job-1'], selected_entities: { 'host.name': 'web-01' } },
        },
      },
    ])('applies $name in place', async ({ existingPanel, content, expected }) => {
      const resolvePanelContent = createResolverMock();

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [existingPanel] },
        upsert: { panels: [{ id: existingPanel.id, content }] },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).not.toHaveBeenCalled();
      expect(result.failures).toEqual([]);
      expect(result.dashboardData.panels).toEqual([{ ...existingPanel, ...expected }]);
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
        dashboardData: { title: 'Test', panels: [existingPanel] },
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
        resolveEsqlVariables: expect.any(Function),
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
        dashboardData: { title: 'Test', panels: [] },
        upsert: {
          panels: [
            {
              id: 'error-rate-kpi',
              content: {
                source: 'request',
                renderer: 'custom_content',
                query: 'Show error rate KPI',
                esql: 'FROM logs-* | STATS error_rate = AVG(error) BY host',
                hasData: true,
                index: 'logs-*',
              },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).toHaveBeenCalledWith({
        renderer: 'custom_content',
        resolveEsqlVariables: expect.any(Function),
        nlQuery: 'Show error rate KPI',
        esql: 'FROM logs-* | STATS error_rate = AVG(error) BY host',
        hasData: true,
        index: 'logs-*',
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

    it('accepts regenerateESQL: false on a new custom_content panel', async () => {
      const resolvePanelContent = createResolverMock(async () =>
        createResolvedPanelContent({
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: { template: '<div>Note</div>' },
        })
      );

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [] },
        upsert: {
          panels: [
            {
              id: 'note',
              content: {
                source: 'request',
                renderer: 'custom_content',
                query: 'A note about the release',
                hasData: false,
                regenerateESQL: false,
              },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(result.failures).toEqual([]);
      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({ renderer: 'custom_content', hasData: false })
      );
    });

    it('passes hasData, regenerateESQL and index of a custom_content edit to the panel resolver', async () => {
      const existingPanel: AttachmentPanel = {
        id: 'cc-1',
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: { esql_query: ['FROM logs | STATS count = COUNT(*)'], template: '<div>Old</div>' },
        grid: { x: 0, y: 0, w: 24, h: 6 },
      };
      const resolvePanelContent = createResolverMock(async () =>
        createResolvedPanelContent({
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: { template: '<div>New</div>' },
        })
      );

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [existingPanel] },
        upsert: {
          panels: [
            {
              id: 'cc-1',
              content: {
                source: 'request',
                renderer: 'custom_content',
                query: 'show errors by host',
                regenerateESQL: true,
                index: 'logs-*',
              },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({
          renderer: 'custom_content',
          nlQuery: 'show errors by host',
          regenerateESQL: true,
          index: 'logs-*',
          existingPanel,
        })
      );
      expect(result.failures).toEqual([]);
    });

    it('accepts a custom_content edit that replaces the query with esql and hasData: true, without a query', async () => {
      const existingPanel: AttachmentPanel = {
        id: 'cc-1',
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: { esql_query: ['FROM logs | STATS count = COUNT(*)'], template: '<div>Old</div>' },
        grid: { x: 0, y: 0, w: 24, h: 6 },
      };
      const resolvePanelContent = createResolverMock(async () =>
        createResolvedPanelContent({
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: { template: '<div>New</div>' },
        })
      );

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [existingPanel] },
        upsert: {
          panels: [
            {
              id: 'cc-1',
              content: {
                source: 'request',
                renderer: 'custom_content',
                esql: 'FROM metrics-* | STATS count = COUNT(*)',
                hasData: true,
              },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({
          renderer: 'custom_content',
          esql: 'FROM metrics-* | STATS count = COUNT(*)',
          hasData: true,
          existingPanel,
        })
      );
      expect(result.failures).toEqual([]);
    });

    it('accepts a custom_content edit that only removes the query with hasData: false', async () => {
      const existingPanel: AttachmentPanel = {
        id: 'cc-1',
        type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
        config: { esql_query: ['FROM logs | STATS count = COUNT(*)'], template: '<div>Old</div>' },
        grid: { x: 0, y: 0, w: 24, h: 6 },
      };
      const resolvePanelContent = createResolverMock(async () =>
        createResolvedPanelContent({
          type: CUSTOM_CONTENT_EMBEDDABLE_TYPE,
          config: { template: '<div>Old</div>' },
        })
      );

      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Test', panels: [existingPanel] },
        upsert: {
          panels: [
            {
              id: 'cc-1',
              content: { source: 'request', renderer: 'custom_content', hasData: false },
            },
          ],
        },
        logger,
        resolvePanelContent,
      });

      expect(resolvePanelContent).toHaveBeenCalledWith(
        expect.objectContaining({ renderer: 'custom_content', hasData: false, existingPanel })
      );
      expect(result.failures).toEqual([]);
    });
  });

  describe('validator', () => {
    const validator: DashboardValidator = {
      validatePanel: ({ config }) =>
        'unrecognizedKey' in config ? ['config.unrecognizedKey: Unrecognized key'] : [],
      validateDashboardFields: () => [],
    };

    it('discards invalid panels after all changes and drops their authoring notes', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Dashboard', panels: [] },
        upsert: {
          panels: [
            { id: 'total-requests', content: metricRequest('show total requests') },
            { id: 'p95-latency', content: metricRequest('show p95 latency') },
          ],
        },
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
        validator,
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

    it('reverts an invalid edit of a panel moved into a new section and keeps the move', async () => {
      const panel = createLensPanel('panel-1');
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Dashboard', panels: [panel] },
        upsert: {
          sections: [{ id: 'overview', title: 'Overview' }],
          panels: [
            { id: 'panel-1', section: 'overview', content: metricRequest('make it invalid') },
          ],
        },
        logger,
        resolvePanelContent: createResolvePanelContent({
          'panel-1': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric', unrecognizedKey: true },
          }),
        }),
        validator,
      });

      expect(getSection(result.dashboardData, 'overview')?.panels).toEqual([
        expect.objectContaining({ id: 'panel-1', config: panel.config }),
      ]);
      expect(result.failures).toEqual([
        expect.objectContaining({
          type: DASHBOARD_FAILURE_TYPES.validateDashboard,
          identifier: 'panel-1',
          error: expect.stringContaining('Panel was reverted to its state before this call'),
        }),
      ]);
      expect(result.panelAuthoringNotes).toEqual([]);
      expect(result.created).toEqual(['overview']);
      expect(result.updated).toEqual(['panel-1']);
    });

    it('does not report a new section as created when the validator drops it', async () => {
      const result = await executeDashboardUpsert({
        dashboardData: { title: 'Dashboard', panels: [] },
        upsert: {
          sections: [{ id: 'overview', title: 'Overview' }],
          panels: [
            { id: 'p95-latency', section: 'overview', content: metricRequest('show p95 latency') },
          ],
        },
        logger,
        resolvePanelContent: createResolvePanelContent({
          'show p95 latency': createResolvedPanelContent({
            type: LENS_EMBEDDABLE_TYPE,
            config: { type: 'metric', unrecognizedKey: true },
          }),
        }),
        validator,
      });

      expect(result.dashboardData.panels).toEqual([]);
      expect(result.failures.map(({ identifier }) => identifier)).toEqual([
        'p95-latency',
        'overview',
      ]);
      expect(result.created).toEqual([]);
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
    expect(control.id).toBe('service.name-options-list');
    expect(control.width).toBe('medium');
    expect(control.grow).toBe(true);
    expect(control.config.values_source).toBe('esql');
    expect(control.config.esql_query).toBe('FROM logs-* | STATS BY `service.name`');
    expect(control.config.title).toBe('Service');
  });

  it('names controls after their field and kind, avoiding ids already in use', async () => {
    const { dashboardData } = await addControls(
      [
        { type: 'options_list_control', field_name: 'host.name', index: 'logs-*' },
        { type: 'options_list_control', field_name: 'host.name', index: 'metrics-*' },
        { type: 'range_slider_control', field_name: 'bytes', index: 'logs-*' },
        { type: 'time_slider_control' },
      ],
      {
        title: 'Test',
        panels: [
          { type: LENS_EMBEDDABLE_TYPE, id: 'host.name-options-list', config: {}, grid: GRID },
        ],
      }
    );

    expect(getControls(dashboardData).map(({ id }) => id)).toEqual([
      'host.name-options-list-2',
      'host.name-options-list-3',
      'bytes-range-slider',
      'time-slider',
    ]);
  });

  it('does not reuse the id of a panel removed in the same call', async () => {
    const { dashboardData, created } = await executeDashboardUpsert({
      dashboardData: {
        title: 'Test',
        panels: [
          { type: LENS_EMBEDDABLE_TYPE, id: 'host.name-options-list', config: {}, grid: GRID },
        ],
      },
      upsert: {
        controls: [{ type: 'options_list_control', field_name: 'host.name', index: 'logs-*' }],
        remove: ['host.name-options-list'],
      },
      logger,
    });

    expect(dashboardData.panels).toEqual([]);
    expect(getControls(dashboardData).map(({ id }) => id)).toEqual(['host.name-options-list-2']);
    expect(created).toEqual(['host.name-options-list-2']);
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
      controlFailure('controls[1]', 'A dashboard can contain at most one time_slider_control.'),
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

  describe('keyed controls', () => {
    const withTwoControls = async () =>
      (
        await addControls([
          { type: 'options_list_control', field_name: 'host.name', index: 'logs-*' },
          { type: 'time_slider_control' },
        ])
      ).dashboardData;

    it('replaces an existing control in place and reports it as updated', async () => {
      const dashboardData = await withTwoControls();

      const result = await addControls(
        [
          {
            id: 'host.name-options-list',
            type: 'range_slider_control',
            field_name: 'bytes',
            index: 'metrics-*',
            title: 'Bytes',
          },
        ],
        dashboardData
      );

      const controls = getControls(result.dashboardData);
      expect(controls.map(({ id, type }) => [id, type])).toEqual([
        ['host.name-options-list', 'range_slider_control'],
        ['time-slider', 'time_slider_control'],
      ]);
      expect(controls[0].config.esql_query).toBe('FROM metrics-* | STATS BY bytes');
      expect(result.created).toEqual([]);
      expect(result.updated).toEqual(['host.name-options-list']);
      expect(result.failures).toEqual([]);
    });

    it('replaces the only time slider with another time slider', async () => {
      const dashboardData = await withTwoControls();

      const result = await addControls(
        [{ id: 'time-slider', type: 'time_slider_control', width: 'large' }],
        dashboardData
      );

      expect(getControls(result.dashboardData).map(({ id, width }) => [id, width])).toEqual([
        ['host.name-options-list', 'medium'],
        ['time-slider', 'large'],
      ]);
      expect(result.failures).toEqual([]);
    });

    it('adds a control with the id the caller chose', async () => {
      const { dashboardData, created } = await addControls([
        { id: 'region', type: 'options_list_control', field_name: 'cloud.region', index: 'logs-*' },
        { type: 'options_list_control', field_name: 'region', index: 'logs-*' },
      ]);

      expect(getControls(dashboardData).map(({ id }) => id)).toEqual([
        'region',
        'region-options-list',
      ]);
      expect(created).toEqual(['region', 'region-options-list']);
    });

    it.each([
      [
        'a duplicate id',
        [
          { id: 'env', type: 'time_slider_control' as const },
          { id: 'env', type: 'time_slider_control' as const },
        ],
        [],
        controlFailure('env', 'Control "env" appears more than once. List each control once.'),
      ],
      [
        'a panel id',
        [{ id: 'panel-1', type: 'time_slider_control' as const }],
        [],
        controlFailure('panel-1', '"panel-1" is a panel id. Use a different id for the control.'),
      ],
      [
        'a new uuid id',
        [{ id: 'b6f1c2d4-8a3e-4f5b-9c7d-1e2f3a4b5c6e', type: 'time_slider_control' as const }],
        [],
        controlFailure(
          'b6f1c2d4-8a3e-4f5b-9c7d-1e2f3a4b5c6e',
          'No control has id "b6f1c2d4-8a3e-4f5b-9c7d-1e2f3a4b5c6e". Copy the id exactly from the dashboard to update the control, or use a short readable id to create a new one.'
        ),
      ],
      [
        'an id that is also removed',
        [{ id: 'time-slider', type: 'time_slider_control' as const }],
        ['time-slider'],
        controlFailure(
          'time-slider',
          '"time-slider" is both updated and removed in this call, so neither change was applied. Do only one.'
        ),
      ],
    ])('rejects a control with %s', async (_, controls, remove, failure) => {
      const dashboardData: DashboardAttachmentData = {
        ...(await withTwoControls()),
        panels: [{ type: LENS_EMBEDDABLE_TYPE, id: 'panel-1', config: {}, grid: GRID }],
      };

      const result = await executeDashboardUpsert({
        dashboardData,
        upsert: { controls, remove },
        logger,
      });

      expect(result.dashboardData).toEqual(dashboardData);
      expect(result.failures).toEqual([failure]);
    });

    it('reports a replacement whose field cannot back a control, even when not user-requested', async () => {
      const dashboardData = await withTwoControls();

      const result = await executeDashboardUpsert({
        dashboardData,
        upsert: {
          controls: [
            {
              id: 'host.name-options-list',
              type: 'options_list_control',
              field_name: 'missing',
              index: 'logs-*',
            },
          ],
        },
        logger,
        resolveControlFieldCapabilities: createFieldCapabilitiesResolver({}),
      });

      expect(result.dashboardData).toEqual(dashboardData);
      expect(result.failures).toEqual([
        controlFailure(
          'host.name-options-list',
          'Field "missing" on index "logs-*" is not mapped.'
        ),
      ]);
    });

    it('keeps one time slider when the replacement of the existing one fails', async () => {
      const dashboardData = await withTwoControls();

      const result = await executeDashboardUpsert({
        dashboardData,
        upsert: {
          controls: [
            {
              id: 'time-slider',
              type: 'options_list_control',
              field_name: 'missing',
              index: 'logs-*',
            },
            { type: 'time_slider_control', user_requested: true },
          ],
        },
        logger,
        resolveControlFieldCapabilities: createFieldCapabilitiesResolver({}),
      });

      expect(result.dashboardData).toEqual(dashboardData);
      expect(result.failures).toEqual([
        controlFailure('time-slider', 'Field "missing" on index "logs-*" is not mapped.'),
        controlFailure('controls[1]', 'A dashboard can contain at most one time_slider_control.'),
      ]);
    });

    it('replaces the existing time slider even when a new one is listed first', async () => {
      const dashboardData = await withTwoControls();

      const result = await addControls(
        [
          { type: 'time_slider_control', user_requested: true },
          { id: 'time-slider', type: 'time_slider_control', width: 'large' },
        ],
        dashboardData
      );

      expect(getControls(result.dashboardData).map(({ id, width }) => [id, width])).toEqual([
        ['host.name-options-list', 'medium'],
        ['time-slider', 'large'],
      ]);
      expect(result.failures).toEqual([
        controlFailure('controls[0]', 'A dashboard can contain at most one time_slider_control.'),
      ]);
    });

    it('reports neither a reverted replacement nor a dropped new control as changed', async () => {
      const dashboardData = await withTwoControls();
      const rejectInvalidTitles: DashboardValidator = {
        validatePanel: () => [],
        validateDashboardFields: ({ pinned_panels: controls = [] }) =>
          controls.flatMap((control, controlIndex) =>
            (control.config as { title?: string }).title === 'Invalid'
              ? [{ path: ['pinned_panels', controlIndex, 'config', 'title'], message: 'Invalid' }]
              : []
          ),
      };

      const result = await executeDashboardUpsert({
        dashboardData,
        upsert: {
          controls: [
            {
              id: 'host.name-options-list',
              type: 'options_list_control',
              field_name: 'host.name',
              index: 'logs-*',
              title: 'Invalid',
            },
            {
              id: 'region',
              type: 'options_list_control',
              field_name: 'region',
              index: 'logs-*',
              title: 'Invalid',
            },
          ],
        },
        logger,
        validator: rejectInvalidTitles,
      });

      expect(result.dashboardData).toEqual(dashboardData);
      expect(result.failures).toEqual([
        expect.objectContaining({
          identifier: 'host.name-options-list',
          error: expect.stringContaining('Control was reverted to its state before this call'),
        }),
        expect.objectContaining({
          identifier: 'region',
          error: expect.stringContaining('Control was not added'),
        }),
      ]);
      expect(result.created).toEqual([]);
      expect(result.updated).toEqual([]);
    });

    it('rejects controls that take the id of a panel or section created in the same call', async () => {
      const dashboardData = await withTwoControls();

      const result = await executeDashboardUpsert({
        dashboardData,
        upsert: {
          sections: [{ id: 'overview', title: 'Overview' }],
          panels: [
            {
              id: 'notes',
              content: {
                source: 'config',
                type: 'markdown',
                config: { content: 'Notes', settings: { open_links_in_new_tab: true } },
              },
            },
          ],
          controls: [
            { id: 'overview', type: 'time_slider_control' },
            { id: 'notes', type: 'time_slider_control' },
          ],
        },
        logger,
      });

      expect(result.dashboardData.pinned_panels).toEqual(dashboardData.pinned_panels);
      expect(result.created).toEqual(['notes', 'overview']);
      expect(result.failures).toEqual([
        controlFailure(
          'overview',
          '"overview" is a section id. Use a different id for the control.'
        ),
        controlFailure('notes', '"notes" is a panel id. Use a different id for the control.'),
      ]);
    });
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

    const fieldOnIndex = (fieldName: string) => `Field "${fieldName}" on index "${index}"`;
    const notMapped = `${fieldOnIndex('field')} is not mapped.`;
    const notAggregatable = `${fieldOnIndex('field')} is not aggregatable.`;
    const conflicting = `${fieldOnIndex('field')} has conflicting mappings.`;
    const optionsListType = `${fieldOnIndex(
      'field'
    )} is not a keyword, numeric, date, ip, boolean, or version field, which options_list_control needs.`;
    const rangeSliderType = `${fieldOnIndex(
      'field'
    )} is not numeric, which range_slider_control needs.`;

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
      expect(failures).toEqual([controlFailure('controls[0]', error)]);
    });

    it('silently leaves out an unresolved control the user did not request', async () => {
      const { dashboardData, failures } = await addValidatedControls(
        [{ type: 'options_list_control', field_name: 'method', index }],
        createFieldCapabilitiesResolver({})
      );

      expect(getEsqlQueries(dashboardData)).toEqual([]);
      expect(failures).toEqual([]);
    });

    it('reports each user-requested control that fails separately', async () => {
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
        controlFailure('controls[0]', `${fieldOnIndex('http_method')} is not mapped.`),
        controlFailure('controls[1]', `${fieldOnIndex('status_code')} is not mapped.`),
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

    const {
      dashboardData: afterRemove,
      failures,
      removed,
    } = await executeDashboardUpsert({
      dashboardData: withControls,
      upsert: { remove: [idToRemove] },
      logger,
    });

    expect(failures).toEqual([]);
    expect(removed).toEqual([idToRemove]);
    const remainingControls = getControls(afterRemove);
    expect(remainingControls).toHaveLength(1);
    expect(remainingControls[0].id).not.toBe(idToRemove);
    expect(remainingControls[0].config.title).toBe('Host');
  });

  it('replaces removed controls without reusing their ids', async () => {
    const { dashboardData: withControls } = await addControls([
      { type: 'options_list_control', field_name: 'host.name', index: 'logs-*' },
      { type: 'time_slider_control' },
    ]);

    const result = await executeDashboardUpsert({
      dashboardData: withControls,
      upsert: {
        controls: [
          { type: 'time_slider_control', width: 'large' },
          { type: 'options_list_control', field_name: 'host.name', index: 'logs-*' },
        ],
        remove: ['host.name-options-list', 'time-slider'],
      },
      logger,
    });

    expect(result.failures).toEqual([]);
    expect(getControls(result.dashboardData).map(({ id }) => id)).toEqual([
      'time-slider-2',
      'host.name-options-list-2',
    ]);
    expect(result.created).toEqual(['time-slider-2', 'host.name-options-list-2']);
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
      upsertFailure(
        undefined,
        'nonexistent-id',
        'Nothing with id "nonexistent-id" exists on the dashboard.'
      ),
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
  it('keeps the section when an attachment inside it cannot be resolved', async () => {
    const resolveAttachmentPanel = jest.fn<PanelContentAttempt, [string]>(() =>
      failedAttempt('not found')
    );

    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Test', panels: [] },
      upsert: {
        sections: [{ id: 'overview', title: 'Overview' }],
        panels: [
          {
            id: 'chart',
            section: 'overview',
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
      attachmentId === 'att-missing' ? failedAttempt('not found') : lnsXYAttempt
    );

    const result = await executeDashboardUpsert({
      dashboardData: { title: 'Test', panels: [] },
      upsert: {
        panels: [
          { id: 'chart', content: attachmentContent('att-1') },
          { id: 'missing-chart', content: attachmentContent('att-missing') },
        ],
      },
      logger,
      resolveAttachmentPanel,
    });

    expect(result.failures).toEqual([panelFailure('missing-chart', 'not found')]);
    expect(getIds(result.dashboardData.panels)).toEqual(['chart']);
  });
});
