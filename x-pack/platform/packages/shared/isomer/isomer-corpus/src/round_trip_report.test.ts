/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderRoundTripReport } from './round_trip_report';
import type { RoundTripDashboardResult } from './round_trip_report';

const dashboards: RoundTripDashboardResult[] = [
  {
    name: 'sample-logs',
    id: 'logs',
    dropped: [{ panelType: 'map', message: 'Panel schema not available' }],
    panels: [
      {
        dashboard: 'sample-logs',
        panelId: 'a',
        title: 'Requests',
        visualizationType: 'lnsXY',
        chartType: 'xy',
        status: 'compared',
        attributes: [
          {
            path: 'state.datasourceStates.formBased.layers.<layer_0>.columns.<layer_0:count()>.params.format.id',
            kind: 'removed',
            before: 'bytes',
          },
        ],
        panel: [],
        api: [],
      },
      {
        dashboard: 'sample-logs',
        panelId: 'b',
        title: 'Bytes',
        visualizationType: 'lnsXY',
        chartType: 'xy',
        status: 'compared',
        attributes: [
          {
            path: 'state.datasourceStates.formBased.layers.<layer_0>.columns.<layer_0:sum(bytes)>.params.format.id',
            kind: 'removed',
            before: 'number',
          },
        ],
        panel: [],
        api: [{ path: 'legend.size', kind: 'added', after: 'auto' }],
      },
      {
        dashboard: 'sample-logs',
        panelId: 'c',
        title: 'Clean | piped',
        visualizationType: 'lnsMetric',
        chartType: 'metric',
        status: 'compared',
        attributes: [],
        panel: [],
        api: [],
      },
    ],
  },
];

describe('renderRoundTripReport', () => {
  const report = renderRoundTripReport(dashboards, { kibanaVersion: '9.7.0' });

  it('summarizes each dashboard', () => {
    expect(report).toContain('| sample-logs | 3 | 2 | 1 | map |');
  });

  it('groups a field lost on several panels into one row', () => {
    expect(report).toContain(
      '| `state.datasourceStates.formBased.layers.<layer>.columns.<column>.params.format.id` | removed | 2 | lnsXY | `"bytes"` | — |'
    );
  });

  it('lists each panel and its differences', () => {
    expect(report).toContain('- **Clean | piped** (`c`, lnsMetric → metric): round-trips');
    expect(report).toContain('  - API:');
    expect(report).toContain('| `legend.size` | added | 1 | lnsXY | — | `"auto"` |');
  });
});
