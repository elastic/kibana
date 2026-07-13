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
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { TIME_SLIDER_CONTROL } from '@kbn/controls-constants';
import type { ToolCall } from '@kbn/agent-builder-genai-utils/langchain';
import { getIndexFields, indexExplorer } from '@kbn/agent-builder-genai-utils';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { PanelContentAttempt } from '../../core/resolve_panel';
import type { ResolvePanelContent } from '../../core/operations/panels';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../../core/failure_types';
import { runCritique } from '../critique';
import {
  dashboardGenTools,
  dispatchToolCall,
  dispatchToolCalls,
  getDashboardGenTools,
  isEditToolName,
} from './tools';

jest.mock('@kbn/agent-builder-genai-utils', () => ({
  indexExplorer: jest.fn(),
  getIndexFields: jest.fn(),
}));
jest.mock('../critique', () => ({ runCritique: jest.fn() }));

const mockedIndexExplorer = jest.mocked(indexExplorer);
const mockedGetIndexFields = jest.mocked(getIndexFields);
const mockedRunCritique = jest.mocked(runCritique);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const successAttempt = (title: string): PanelContentAttempt => ({
  type: 'success',
  panelContent: { type: LENS_EMBEDDABLE_TYPE, config: { title } },
});

const failureAttempt = (identifier: string, error: string): PanelContentAttempt => ({
  type: 'failure',
  failure: { type: DASHBOARD_OPERATION_FAILURE_TYPES.addPanels, identifier, error },
});

const createLensPanel = (id: string, gridY = 0): AttachmentPanel => ({
  type: LENS_EMBEDDABLE_TYPE,
  id,
  config: { type: 'metric' },
  grid: { x: 0, y: gridY, w: 24, h: 9 },
});

const createMarkdownPanel = (id: string, content: string): AttachmentPanel => ({
  id,
  type: MARKDOWN_EMBEDDABLE_TYPE,
  config: { content },
  grid: { x: 0, y: 0, w: 48, h: 5 },
});

const emptyDashboard = (): DashboardAttachmentData => ({
  title: 'Test Dashboard',
  description: undefined,
  panels: [],
});

const grid = { x: 0, y: 0, w: 24, h: 9 };

const call = (toolName: string, args: Record<string, unknown>, id = 'call-1'): ToolCall => ({
  toolCallId: id,
  toolName,
  args,
});

const logger = createMockLogger();
const deps = (resolvePanelContent?: ResolvePanelContent) => ({ logger, resolvePanelContent });
const exploreDeps = () => ({
  logger,
  esClient: { asCurrentUser: {} } as IScopedClusterClient,
  model: { chatModel: {} } as ScopedModel,
});

const getPanels = (dashboard: DashboardAttachmentData): AttachmentPanel[] =>
  dashboard.panels.filter((p): p is AttachmentPanel => !isSection(p));

const getSections = (dashboard: DashboardAttachmentData): DashboardSection[] =>
  dashboard.panels.filter(isSection);

describe('dashboard orchestrator bound tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes the 9 operations plus the read-only explore and critique tools', () => {
    expect(dashboardGenTools.map((t) => t.name).sort()).toEqual(
      [
        'add_controls',
        'add_panels',
        'add_section',
        'edit_panels',
        'explore_data',
        'critique_dashboard',
        'remove_controls',
        'remove_panels',
        'remove_section',
        'set_metadata',
        'update_panel_layouts',
      ].sort()
    );
    for (const t of dashboardGenTools) {
      expect(isEditToolName(t.name)).toBe(
        t.name !== 'explore_data' && t.name !== 'critique_dashboard'
      );
    }
  });

  it('only includes critique_dashboard for existing-dashboard workflows', () => {
    expect(getDashboardGenTools({ includeCritique: false }).map(({ name }) => name)).not.toContain(
      'critique_dashboard'
    );
    expect(getDashboardGenTools({ includeCritique: true }).map(({ name }) => name)).toContain(
      'critique_dashboard'
    );
  });

  it('rejects unknown tools and invalid arguments', async () => {
    const state = { dashboard: emptyDashboard() };

    const unknown = await dispatchToolCall(state, call('nope', {}), deps());
    expect(unknown.message.success).toBe(false);
    expect(unknown.message.error).toContain('Unknown tool: nope');

    const invalid = await dispatchToolCall(state, call('remove_panels', {}), deps());
    expect(invalid.message.success).toBe(false);
    expect(invalid.message.error).toContain('Invalid arguments for remove_panels');
  });

  it('runs critique once with the full current dashboard and original request', async () => {
    const dashboard = {
      ...emptyDashboard(),
      panels: [createLensPanel('lens-1')],
    };
    const findings = [
      {
        target: 'lens-1',
        category: 'presentation' as const,
        issue: 'The title is unclear.',
        suggestion: 'Use a specific title.',
        requiresDataChange: false,
      },
    ];
    mockedRunCritique.mockResolvedValueOnce(findings);
    const critiqueDeps = exploreDeps();

    const result = await dispatchToolCall(
      { dashboard, request: 'Prettify this dashboard' },
      call('critique_dashboard', {}),
      critiqueDeps,
      getDashboardGenTools({ includeCritique: true })
    );

    expect(mockedRunCritique).toHaveBeenCalledTimes(1);
    expect(mockedRunCritique).toHaveBeenCalledWith({
      model: critiqueDeps.model,
      request: 'Prettify this dashboard',
      dashboard,
    });
    expect(result).toEqual({ message: { success: true, data: { findings } } });
  });

  it('does not dispatch critique without the existing-dashboard tool set', async () => {
    const result = await dispatchToolCall(
      { dashboard: emptyDashboard(), request: 'Prettify this dashboard' },
      call('critique_dashboard', {}),
      exploreDeps()
    );

    expect(result.message).toEqual({
      success: false,
      error: 'Unknown tool: critique_dashboard',
    });
    expect(mockedRunCritique).not.toHaveBeenCalled();
  });

  describe('set_metadata', () => {
    it('updates title and description without mutating the input state', async () => {
      const state = { dashboard: emptyDashboard() };

      const result = await dispatchToolCall(
        state,
        call('set_metadata', { title: 'Sales KPIs', description: 'Quarterly overview' }),
        deps()
      );

      expect(result.message.success).toBe(true);
      expect(result.dashboard?.title).toBe('Sales KPIs');
      expect(result.dashboard?.description).toBe('Quarterly overview');
      // in-state payload untouched
      expect(state.dashboard.title).toBe('Test Dashboard');
    });
  });

  describe('add_panels', () => {
    it('resolves multiple request panels in parallel within one call', async () => {
      const first = createDeferred<PanelContentAttempt>();
      const second = createDeferred<PanelContentAttempt>();
      const pending = [first, second];
      const started: string[] = [];

      const resolver: ResolvePanelContent = jest.fn(async (request) => {
        started.push(request.nlQuery);
        return pending.shift()!.promise;
      });

      const dispatchPromise = dispatchToolCall(
        { dashboard: emptyDashboard() },
        call('add_panels', {
          panels: [
            { source: 'request', type: 'vis', grid, query: 'cpu over time' },
            { source: 'request', type: 'vis', grid: { ...grid, y: 9 }, query: 'memory over time' },
          ],
        }),
        deps(resolver)
      );

      // Both resolutions must have started before either resolved.
      await new Promise((res) => setImmediate(res));
      expect(started).toEqual(['cpu over time', 'memory over time']);

      first.resolve(successAttempt('cpu'));
      second.resolve(successAttempt('memory'));

      const result = await dispatchPromise;
      expect(result.message.success).toBe(true);
      expect(getPanels(result.dashboard!)).toHaveLength(2);
      expect(result.failures).toEqual([]);
    });

    it('records a soft failure and applies the remaining panels when one resolution fails', async () => {
      const resolver: ResolvePanelContent = jest
        .fn()
        .mockResolvedValueOnce(failureAttempt('broken query', 'no such index'))
        .mockResolvedValueOnce(successAttempt('works'));

      const result = await dispatchToolCall(
        { dashboard: emptyDashboard() },
        call('add_panels', {
          panels: [
            { source: 'request', type: 'vis', grid, query: 'broken query' },
            { source: 'request', type: 'vis', grid: { ...grid, y: 9 }, query: 'works' },
          ],
        }),
        deps(resolver)
      );

      expect(result.message.success).toBe(true);
      expect(getPanels(result.dashboard!)).toHaveLength(1);
      expect(result.failures).toEqual([
        expect.objectContaining({ identifier: 'broken query', error: 'no such index' }),
      ]);
    });

    it('adds a config-source markdown panel by value', async () => {
      const result = await dispatchToolCall(
        { dashboard: emptyDashboard() },
        call('add_panels', {
          panels: [
            {
              source: 'config',
              type: 'markdown',
              grid: { x: 0, y: 0, w: 48, h: 5 },
              config: { content: '# Overview' },
            },
          ],
        }),
        deps()
      );

      expect(result.message.success).toBe(true);
      const panels = getPanels(result.dashboard!);
      expect(panels).toHaveLength(1);
      expect(panels[0].type).toBe(MARKDOWN_EMBEDDABLE_TYPE);
    });
  });

  describe('edit_panels', () => {
    it('edits a markdown panel by config', async () => {
      const dashboard = {
        ...emptyDashboard(),
        panels: [createMarkdownPanel('md-1', 'old')],
      };

      const result = await dispatchToolCall(
        { dashboard },
        call('edit_panels', {
          panels: [
            { source: 'config', type: 'markdown', panelId: 'md-1', config: { content: 'new' } },
          ],
        }),
        deps()
      );

      expect(result.message.success).toBe(true);
      const [panel] = getPanels(result.dashboard!);
      expect(panel.config).toEqual({ content: 'new' });
    });

    it('re-resolves a vis panel via the resolver, passing the existing panel', async () => {
      const existing = createLensPanel('lens-1');
      const dashboard = { ...emptyDashboard(), panels: [existing] };
      const resolver: ResolvePanelContent = jest.fn().mockResolvedValue(successAttempt('updated'));

      const result = await dispatchToolCall(
        { dashboard },
        call('edit_panels', {
          panels: [{ source: 'request', panelId: 'lens-1', query: 'make it a bar chart' }],
        }),
        deps(resolver)
      );

      expect(result.message.success).toBe(true);
      expect(resolver).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: 'edit_panels',
          identifier: 'lens-1',
          existingPanel: expect.objectContaining({ id: 'lens-1' }),
        })
      );
      const [panel] = getPanels(result.dashboard!);
      expect(panel.config).toEqual({ title: 'updated' });
    });

    it('records a soft failure for a missing panel', async () => {
      const result = await dispatchToolCall(
        { dashboard: emptyDashboard() },
        call('edit_panels', {
          panels: [
            { source: 'config', type: 'markdown', panelId: 'ghost', config: { content: 'x' } },
          ],
        }),
        deps()
      );

      expect(result.message.success).toBe(true);
      expect(result.failures).toEqual([
        expect.objectContaining({ identifier: 'ghost', type: 'edit_panels' }),
      ]);
    });
  });

  describe('update_panel_layouts', () => {
    it('updates a panel grid and records failures for missing panels', async () => {
      const dashboard = { ...emptyDashboard(), panels: [createLensPanel('lens-1')] };

      const result = await dispatchToolCall(
        { dashboard },
        call('update_panel_layouts', {
          panels: [
            { panelId: 'lens-1', grid: { x: 24, y: 0, w: 24, h: 9 } },
            { panelId: 'ghost', grid },
          ],
        }),
        deps()
      );

      expect(result.message.success).toBe(true);
      const [panel] = getPanels(result.dashboard!);
      expect(panel.grid).toEqual({ x: 24, y: 0, w: 24, h: 9 });
      expect(result.failures).toEqual([
        expect.objectContaining({ identifier: 'ghost', type: 'update_panel_layouts' }),
      ]);
    });
  });

  describe('add_section / remove_section', () => {
    it('adds a section with inline request panels', async () => {
      const resolver: ResolvePanelContent = jest.fn().mockResolvedValue(successAttempt('inline'));

      const result = await dispatchToolCall(
        { dashboard: emptyDashboard() },
        call('add_section', {
          title: 'Errors',
          grid: { y: 0 },
          panels: [{ source: 'request', type: 'vis', grid, query: 'error rate' }],
        }),
        deps(resolver)
      );

      expect(result.message.success).toBe(true);
      const [section] = getSections(result.dashboard!);
      expect(section.title).toBe('Errors');
      expect(section.panels).toHaveLength(1);
    });

    it('remove_section promotes panels to top level', async () => {
      const section: DashboardSection = {
        id: 'sec-1',
        title: 'S',
        collapsed: false,
        grid: { y: 0 },
        panels: [createLensPanel('lens-1')],
      };
      const dashboard = { ...emptyDashboard(), panels: [section] };

      const result = await dispatchToolCall(
        { dashboard },
        call('remove_section', { id: 'sec-1', panelAction: 'promote' }),
        deps()
      );

      expect(result.message.success).toBe(true);
      expect(getSections(result.dashboard!)).toHaveLength(0);
      expect(getPanels(result.dashboard!)).toHaveLength(1);
    });

    it('remove_section surfaces a handler throw as a failed tool message without mutating state', async () => {
      const section: DashboardSection = {
        id: 'sec-1',
        title: 'S',
        collapsed: false,
        grid: { y: 0 },
        panels: [createLensPanel('lens-1')],
      };
      const state = { dashboard: { ...emptyDashboard(), panels: [section] } };

      const result = await dispatchToolCall(
        state,
        call('remove_section', { id: 'ghost', panelAction: 'delete' }),
        deps()
      );

      expect(result.message.success).toBe(false);
      expect(result.message.error).toContain('Section "ghost" not found.');
      expect(result.dashboard).toBeUndefined();
      // in-state payload untouched by the failed dispatch
      expect(getSections(state.dashboard)).toHaveLength(1);
      expect(getSections(state.dashboard)[0].panels).toHaveLength(1);
    });
  });

  describe('remove_panels', () => {
    it('removes panels by id', async () => {
      const dashboard = {
        ...emptyDashboard(),
        panels: [createLensPanel('lens-1'), createLensPanel('lens-2', 9)],
      };

      const result = await dispatchToolCall(
        { dashboard },
        call('remove_panels', { panelIds: ['lens-1'] }),
        deps()
      );

      expect(result.message.success).toBe(true);
      expect(getPanels(result.dashboard!).map((p) => p.id)).toEqual(['lens-2']);
    });
  });

  describe('batch dispatch (one agent turn)', () => {
    it('resolves panel content across SEPARATE calls in parallel, applying in order', async () => {
      const first = createDeferred<PanelContentAttempt>();
      const second = createDeferred<PanelContentAttempt>();
      const pending = [first, second];
      const started: string[] = [];

      const resolver: ResolvePanelContent = jest.fn(async (request) => {
        started.push(request.nlQuery);
        return pending.shift()!.promise;
      });

      const dispatchPromise = dispatchToolCalls(
        { dashboard: emptyDashboard() },
        [
          call(
            'add_section',
            {
              title: 'CPU',
              grid: { y: 0 },
              panels: [{ source: 'request', type: 'vis', grid, query: 'cpu over time' }],
            },
            'call-1'
          ),
          call(
            'add_section',
            {
              title: 'Memory',
              grid: { y: 1 },
              panels: [{ source: 'request', type: 'vis', grid, query: 'memory over time' }],
            },
            'call-2'
          ),
        ],
        deps(resolver)
      );

      // Both sections' panel resolutions must start before either resolves —
      // this is the cross-call batching that separate dispatches would lose.
      await new Promise((res) => setImmediate(res));
      expect(started).toEqual(['cpu over time', 'memory over time']);

      first.resolve(successAttempt('cpu'));
      second.resolve(successAttempt('memory'));

      const { dashboard, results } = await dispatchPromise;
      expect(results.map((r) => r.message.success)).toEqual([true, true]);
      const sections = getSections(dashboard);
      expect(sections.map((s) => s.title)).toEqual(['CPU', 'Memory']);
      expect(sections[0].panels).toHaveLength(1);
      expect(sections[1].panels).toHaveLength(1);
    });

    it('attributes failures to the call that produced them', async () => {
      const resolver: ResolvePanelContent = jest
        .fn()
        .mockResolvedValueOnce(failureAttempt('broken query', 'no such index'))
        .mockResolvedValueOnce(successAttempt('works'));

      const { results } = await dispatchToolCalls(
        { dashboard: emptyDashboard() },
        [
          call(
            'add_panels',
            { panels: [{ source: 'request', type: 'vis', grid, query: 'broken query' }] },
            'call-1'
          ),
          call(
            'add_panels',
            {
              panels: [{ source: 'request', type: 'vis', grid: { ...grid, y: 9 }, query: 'works' }],
            },
            'call-2'
          ),
        ],
        deps(resolver)
      );

      expect(results[0].failures).toEqual([
        expect.objectContaining({ identifier: 'broken query' }),
      ]);
      expect(results[1].failures).toEqual([]);
    });

    it('marks successful recovery ids resolved and preserves ids on another terminal failure', async () => {
      const resolver: ResolvePanelContent = jest.fn(
        async (request): Promise<PanelContentAttempt> =>
          request.nlQuery === 'works'
            ? successAttempt('works')
            : {
                type: 'failure',
                failure: {
                  failureId: request.failureId,
                  type: DASHBOARD_OPERATION_FAILURE_TYPES.addPanels,
                  identifier: request.nlQuery,
                  error: 'still broken',
                },
              }
      );

      const { results } = await dispatchToolCalls(
        { dashboard: emptyDashboard() },
        [
          call(
            'add_panels',
            {
              panels: [
                {
                  source: 'request',
                  type: 'vis',
                  grid,
                  query: 'works',
                  resolvesFailureId: 'failure-1',
                },
              ],
            },
            'call-1'
          ),
          call(
            'add_panels',
            {
              panels: [
                {
                  source: 'request',
                  type: 'vis',
                  grid: { ...grid, y: 9 },
                  query: 'still broken',
                  resolvesFailureId: 'failure-2',
                },
              ],
            },
            'call-2'
          ),
        ],
        deps(resolver)
      );

      expect(results[0].resolvedFailureIds).toEqual(['failure-1']);
      expect(results[1].resolvedFailureIds).toEqual([]);
      expect(results[1].failures).toEqual([
        expect.objectContaining({ failureId: 'failure-2', error: 'still broken' }),
      ]);
    });

    it('isolates a throwing call: earlier and later calls still apply', async () => {
      const { dashboard, results } = await dispatchToolCalls(
        { dashboard: emptyDashboard() },
        [
          call('set_metadata', { title: 'Before' }, 'call-1'),
          call('remove_section', { id: 'ghost', panelAction: 'delete' }, 'call-2'),
          call('set_metadata', { description: 'After' }, 'call-3'),
        ],
        deps()
      );

      expect(results.map((r) => r.message.success)).toEqual([true, false, true]);
      expect(results[1].message.error).toContain('Section "ghost" not found.');
      expect(dashboard.title).toBe('Before');
      expect(dashboard.description).toBe('After');
    });
  });

  describe('explore_data', () => {
    beforeEach(() => {
      mockedIndexExplorer.mockReset();
      mockedGetIndexFields.mockReset();
    });

    it('resolves a target once and returns its fields without touching the dashboard', async () => {
      mockedIndexExplorer.mockResolvedValue({
        resources: [{ type: 'data_stream', name: 'metrics-otel-default', reason: 'best match' }],
      } as Awaited<ReturnType<typeof indexExplorer>>);
      mockedGetIndexFields.mockResolvedValue({
        'metrics-otel-default': {
          fields: [
            { path: 'system.cpu.utilization', type: 'double' },
            { path: 'host.name', type: 'keyword' },
          ],
        },
      } as unknown as Awaited<ReturnType<typeof getIndexFields>>);

      const result = await dispatchToolCall(
        { dashboard: emptyDashboard() },
        call('explore_data', { query: 'host metrics monitoring' }),
        exploreDeps()
      );

      expect(result.message.success).toBe(true);
      expect(result.dashboard).toBeUndefined();
      expect(result.message.data).toEqual({
        target: 'metrics-otel-default',
        type: 'data_stream',
        fields: [
          { path: 'system.cpu.utilization', type: 'double' },
          { path: 'host.name', type: 'keyword' },
        ],
      });
      expect(mockedIndexExplorer).toHaveBeenCalledWith(
        expect.objectContaining({ nlQuery: 'host metrics monitoring', limit: 1 })
      );
    });

    it('uses the platform-consistent 500-field result cap', async () => {
      mockedIndexExplorer.mockResolvedValue({
        resources: [{ type: 'index', name: 'wide-index', reason: 'best match' }],
      } as Awaited<ReturnType<typeof indexExplorer>>);
      mockedGetIndexFields.mockResolvedValue({
        'wide-index': {
          fields: Array.from({ length: 501 }, (_, i) => ({
            path: `field_${i}`,
            type: 'keyword',
          })),
        },
      } as unknown as Awaited<ReturnType<typeof getIndexFields>>);

      const result = await dispatchToolCall(
        { dashboard: emptyDashboard() },
        call('explore_data', { query: 'wide data' }),
        exploreDeps()
      );

      expect(result.message.data).toEqual(
        expect.objectContaining({
          fields: expect.arrayContaining([
            { path: 'field_0', type: 'keyword' },
            { path: 'field_499', type: 'keyword' },
          ]),
          omitted_field_count: 1,
        })
      );
      expect((result.message.data as { fields: unknown[] }).fields).toHaveLength(500);
    });

    it('fails gracefully when no target matches or deps are missing', async () => {
      mockedIndexExplorer.mockResolvedValue({ resources: [] } as unknown as Awaited<
        ReturnType<typeof indexExplorer>
      >);

      const noMatch = await dispatchToolCall(
        { dashboard: emptyDashboard() },
        call('explore_data', { query: 'nothing' }),
        exploreDeps()
      );
      expect(noMatch.message.success).toBe(false);
      expect(noMatch.message.error).toContain('No matching index');

      const noDeps = await dispatchToolCall(
        { dashboard: emptyDashboard() },
        call('explore_data', { query: 'anything' }),
        deps()
      );
      expect(noDeps.message.success).toBe(false);
      expect(noDeps.message.error).toContain('not available');
      expect(mockedIndexExplorer).toHaveBeenCalledTimes(1);
    });
  });

  describe('add_controls / remove_controls', () => {
    it('adds a control and rejects a duplicate time slider with a soft failure', async () => {
      const state = { dashboard: emptyDashboard() };

      const first = await dispatchToolCall(
        state,
        call('add_controls', { controls: [{ type: TIME_SLIDER_CONTROL }] }),
        deps()
      );
      expect(first.message.success).toBe(true);
      expect(first.dashboard?.pinned_panels).toHaveLength(1);

      const second = await dispatchToolCall(
        { dashboard: first.dashboard! },
        call('add_controls', { controls: [{ type: TIME_SLIDER_CONTROL }] }),
        deps()
      );
      expect(second.message.success).toBe(true);
      expect(second.dashboard?.pinned_panels).toHaveLength(1);
      expect(second.failures).toEqual([
        expect.objectContaining({
          error: 'A dashboard can contain at most one time_slider_control.',
        }),
      ]);
    });

    it('removes controls by id', async () => {
      const state = { dashboard: emptyDashboard() };
      const added = await dispatchToolCall(
        state,
        call('add_controls', { controls: [{ type: TIME_SLIDER_CONTROL }] }),
        deps()
      );
      const controlId = (added.dashboard!.pinned_panels![0] as { id: string }).id;

      const removed = await dispatchToolCall(
        { dashboard: added.dashboard! },
        call('remove_controls', { control_ids: [controlId] }),
        deps()
      );

      expect(removed.message.success).toBe(true);
      expect(removed.dashboard?.pinned_panels).toEqual([]);
    });
  });
});
