/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ModelProvider } from '@kbn/agent-builder-server';
import { isSection, type DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { DashboardPluginStart } from '@kbn/dashboard-plugin/server';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import { createSavedObjectDashboardStore } from './saved_object_dashboard_store';

const dashboardClient = { read: jest.fn(), create: jest.fn(), update: jest.fn() };
const request = httpServerMock.createKibanaRequest();

const createStore = () =>
  createSavedObjectDashboardStore({
    dashboardClient: dashboardClient as unknown as DashboardPluginStart['client'],
    savedObjectsClient: savedObjectsClientMock.create(),
    request,
    spaceId: 'default',
    basePath: { serverBasePath: '' },
    modelProvider: { getDefaultModel: jest.fn().mockResolvedValue({}) } as unknown as ModelProvider,
    lensApiFormat: true,
  });

const grid = { x: 0, y: 0, w: 24, h: 15 };
const movedGrid = { x: 24, y: 15, w: 12, h: 10 };

// The attachment pretty-prints the spec and keeps only the spec, title and description.
const storedVegaPanel = {
  type: VISUALIZE_EMBEDDABLE_TYPE,
  id: 'vega',
  grid,
  config: {
    savedVis: {
      type: 'vega',
      title: 'Vega',
      description: '',
      params: { spec: '{"mark":"bar"}' },
      uiState: { vis: { legendOpen: false } },
      data: { aggs: [], searchSource: {} },
    },
  },
};
const storedTsvbPanel = {
  type: VISUALIZE_EMBEDDABLE_TYPE,
  id: 'tsvb',
  grid,
  config: { savedVis: { type: 'metrics', params: { index_pattern: 'logs-*' } } },
};
const storedSection = {
  id: 'section-1',
  title: 'Section',
  collapsed: false,
  grid: { y: 20 },
  panels: [{ ...storedVegaPanel, id: 'vega-2' }],
};

const moveAllPanels = (data: DashboardAttachmentData): DashboardAttachmentData => ({
  ...data,
  panels: data.panels.map((widget) =>
    isSection(widget)
      ? { ...widget, panels: widget.panels.map((panel) => ({ ...panel, grid: movedGrid })) }
      : { ...widget, grid: movedGrid }
  ),
});

describe('createSavedObjectDashboardStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dashboardClient.read.mockResolvedValue({
      id: 'dash-id',
      data: { title: 'Dash', panels: [storedVegaPanel, storedTsvbPanel, storedSection] },
      meta: {},
    });
    dashboardClient.update.mockResolvedValue({ id: 'dash-id', data: {}, meta: {} });
  });

  it('fails `source: "attachment"` panels and points to the sources that work', async () => {
    const store = await createStore();

    expect(store.resolveAttachmentPanel('viz-1')).toEqual({
      type: 'failure',
      error: expect.stringMatching(/source: "request".*source: "config"/),
    });
  });

  it('reports a missing dashboard by its id', async () => {
    dashboardClient.read.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('dashboard', 'missing-id')
    );
    const store = await createStore();

    await expect(store.load('missing-id')).rejects.toThrow('Dashboard "missing-id" not found.');
  });

  it('reads the dashboard the way the Dashboard app loads it', async () => {
    const store = await createStore();

    await store.load('dash-id');

    expect(dashboardClient.read).toHaveBeenCalledWith(expect.anything(), 'dash-id', {
      isDashboardAppRequest: true,
    });
  });

  it('keeps the stored form of panels the call did not change, with their new grid', async () => {
    const store = await createStore();
    const loaded = await store.load('dash-id');

    await store.save(moveAllPanels(loaded.data), loaded);

    expect(dashboardClient.update).toHaveBeenCalledWith(
      request,
      'dash-id',
      expect.objectContaining({
        panels: [
          { ...storedVegaPanel, grid: movedGrid },
          { ...storedTsvbPanel, grid: movedGrid },
          { ...storedSection, panels: [{ ...storedVegaPanel, id: 'vega-2', grid: movedGrid }] },
        ],
      }),
      { isDashboardAppRequest: true }
    );
  });

  it('saves changed and new panels from the attachment', async () => {
    const store = await createStore();
    const loaded = await store.load('dash-id');
    const markdownPanel = { type: 'markdown', id: 'md', grid, config: { content: '# Notes' } };

    await store.save(
      {
        ...loaded.data,
        panels: [
          ...loaded.data.panels.map((widget) =>
            widget.id === 'vega' && !isSection(widget)
              ? { ...widget, config: { ...widget.config, title: 'Renamed' } }
              : widget
          ),
          markdownPanel,
        ],
      },
      loaded
    );

    const [[, , { panels }]] = dashboardClient.update.mock.calls;
    expect(panels[0]).toEqual({
      type: VISUALIZE_EMBEDDABLE_TYPE,
      id: 'vega',
      grid,
      config: expect.objectContaining({
        title: 'Renamed',
        savedVis: expect.objectContaining({ title: 'Renamed', uiState: {} }),
      }),
    });
    expect(panels[1]).toEqual(storedTsvbPanel);
    expect(panels[3]).toEqual(markdownPanel);
  });

  it('creates a new dashboard the way the Dashboard app saves it', async () => {
    dashboardClient.create.mockResolvedValue({ id: 'new-id', data: {}, meta: {} });
    const store = await createStore();

    await store.save({ title: 'T', panels: [] }, undefined);

    expect(dashboardClient.create).toHaveBeenCalledWith(
      request,
      expect.objectContaining({ title: 'T', panels: [] }),
      { isDashboardAppRequest: true }
    );
  });

  it('builds the dashboard url from the server base path without a space prefix in the default space', async () => {
    dashboardClient.create.mockResolvedValue({ id: 'a b', data: {}, meta: {} });
    const store = await createStore();

    await expect(store.save({ title: 'T', panels: [] }, undefined)).resolves.toEqual({
      dashboard_id: 'a b',
      url: '/app/dashboards#/view/a%20b',
    });
  });
});
