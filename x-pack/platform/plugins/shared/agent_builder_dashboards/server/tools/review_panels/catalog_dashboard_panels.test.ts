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
});
