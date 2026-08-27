/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import {
  catalogDashboardControls,
  catalogDashboardPanels,
  catalogDashboardSections,
} from './catalog_dashboard_panels';

const grid = { x: 0, y: 0, w: 24, h: 12 };

describe('catalogDashboardPanels', () => {
  it('lists top-level panels with titles and grid', () => {
    expect(
      catalogDashboardPanels({
        title: 'Metrics',
        panels: [
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'lens-1',
            grid,
            config: { title: 'Error rate' },
          },
        ],
      })
    ).toEqual([
      {
        id: 'lens-1',
        type: LENS_EMBEDDABLE_TYPE,
        title: 'Error rate',
        grid,
      },
    ]);
  });

  it('records hide_title when the dashboard chrome title is already hidden', () => {
    expect(
      catalogDashboardPanels({
        title: 'Metrics',
        panels: [
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'lens-1',
            grid,
            config: { title: 'Requests', type: 'metric', hide_title: true },
          },
        ],
      })
    ).toEqual([
      {
        id: 'lens-1',
        type: LENS_EMBEDDABLE_TYPE,
        title: 'Requests',
        chart_type: 'metric',
        grid,
        hide_title: true,
      },
    ]);
  });

  it('includes the Lens chart type so review can leave wide tables alone', () => {
    expect(
      catalogDashboardPanels({
        title: 'Metrics',
        panels: [
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'table-1',
            grid: { x: 0, y: 60, w: 48, h: 19 },
            config: { title: 'Errors by host', type: 'data_table' },
          },
        ],
      })
    ).toEqual([
      {
        id: 'table-1',
        type: LENS_EMBEDDABLE_TYPE,
        title: 'Errors by host',
        chart_type: 'data_table',
        grid: { x: 0, y: 60, w: 48, h: 19 },
      },
    ]);
  });

  it('flattens section panels and records the section id', () => {
    expect(
      catalogDashboardPanels({
        title: 'Metrics',
        panels: [
          {
            id: 'sec-1',
            title: 'Overview',
            collapsed: false,
            grid: { y: 0 },
            panels: [
              {
                type: LENS_EMBEDDABLE_TYPE,
                id: 'lens-2',
                grid,
                config: {},
              },
            ],
          },
        ],
      })
    ).toEqual([
      {
        id: 'lens-2',
        type: LENS_EMBEDDABLE_TYPE,
        grid,
        section_id: 'sec-1',
      },
    ]);
  });

  it('lists existing sections without flattening their titles away', () => {
    expect(
      catalogDashboardSections({
        title: 'Metrics',
        panels: [
          {
            id: 'sec-1',
            title: 'Overview',
            collapsed: false,
            grid: { y: 0 },
            panels: [
              {
                type: LENS_EMBEDDABLE_TYPE,
                id: 'lens-2',
                grid,
                config: {},
              },
            ],
          },
        ],
      })
    ).toEqual([{ id: 'sec-1', title: 'Overview' }]);
  });

  it('lists pinned controls with id, type, and title', () => {
    expect(
      catalogDashboardControls({
        title: 'Metrics',
        panels: [],
        pinned_panels: [
          { id: 'c1', type: 'options_list_control', config: { title: 'Host' } },
          { id: 'c2', type: 'range_slider_control', config: {} },
          { type: 'options_list_control' },
        ],
      })
    ).toEqual([
      { id: 'c1', type: 'options_list_control', title: 'Host' },
      { id: 'c2', type: 'range_slider_control' },
    ]);
  });

  it('records metric fill, secondary value, and background chart from the primary metric', () => {
    expect(
      catalogDashboardPanels({
        title: 'Metrics',
        panels: [
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'filled',
            grid,
            config: {
              title: 'Requests',
              type: 'metric',
              metrics: [
                {
                  type: 'primary',
                  column: 'count',
                  color: { type: 'static', color: '#F5C518' },
                  apply_color_to: 'background',
                },
              ],
            },
          },
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'rich',
            grid,
            config: {
              title: 'Bytes',
              type: 'metric',
              metrics: [
                {
                  type: 'primary',
                  column: 'avg_bytes',
                  background_chart: { type: 'trend' },
                },
                { type: 'secondary', column: 'max_bytes' },
              ],
            },
          },
        ],
      })
    ).toEqual([
      {
        id: 'filled',
        type: LENS_EMBEDDABLE_TYPE,
        title: 'Requests',
        chart_type: 'metric',
        grid,
        apply_color_to: 'background',
      },
      {
        id: 'rich',
        type: LENS_EMBEDDABLE_TYPE,
        title: 'Bytes',
        chart_type: 'metric',
        grid,
        has_secondary_metric: true,
        background_chart: 'trend',
      },
    ]);
  });

  it('includes ES|QL from the Lens data source so review can see what the panel queries', () => {
    expect(
      catalogDashboardPanels({
        title: 'Metrics',
        panels: [
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'lens-1',
            grid,
            config: {
              title: 'Error rate',
              type: 'metric',
              data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*)' },
            },
          },
        ],
      })
    ).toEqual([
      {
        id: 'lens-1',
        type: LENS_EMBEDDABLE_TYPE,
        title: 'Error rate',
        chart_type: 'metric',
        esql: 'FROM logs | STATS count = COUNT(*)',
        grid,
      },
    ]);
  });
});
