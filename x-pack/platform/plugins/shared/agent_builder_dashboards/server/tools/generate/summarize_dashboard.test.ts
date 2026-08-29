/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { summarizeDashboard } from './summarize_dashboard';

describe('summarizeDashboard', () => {
  it('includes chartType from the Lens config type so review can judge layout by chart family', () => {
    const summary = summarizeDashboard(
      {
        title: 'Logs',
        description: 'Overview',
        panels: [
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'm1',
            grid: { x: 0, y: 0, w: 48, h: 5 },
            config: { type: 'metric' },
          },
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'x1',
            grid: { x: 0, y: 5, w: 48, h: 10 },
            config: { type: 'xy' },
          },
        ],
        pinned_panels: [
          {
            id: 'c1',
            type: 'options_list_control',
            config: { title: 'Host', esql_query: 'FROM logs-* | STATS BY `host.name`' },
          },
        ],
      },
      new Map([['m1', 'Total events']])
    );

    expect(summary.panels).toEqual([
      {
        type: LENS_EMBEDDABLE_TYPE,
        id: 'm1',
        grid: { x: 0, y: 0, w: 48, h: 5 },
        chart_type: 'metric',
        authoring_note: 'Total events',
      },
      {
        type: LENS_EMBEDDABLE_TYPE,
        id: 'x1',
        grid: { x: 0, y: 5, w: 48, h: 10 },
        chart_type: 'xy',
      },
    ]);
    expect(summary.controls).toEqual([
      {
        id: 'c1',
        type: 'options_list_control',
        title: 'Host',
        esql_query: 'FROM logs-* | STATS BY `host.name`',
      },
    ]);
  });
});
