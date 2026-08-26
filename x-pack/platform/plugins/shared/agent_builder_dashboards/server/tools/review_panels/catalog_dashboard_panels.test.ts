/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { catalogDashboardPanels } from './catalog_dashboard_panels';

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
