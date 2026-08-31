/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_REVIEW_TOPIC } from '@kbn/agent-builder-visualizations-server';
import { lintDashboardVisualizationEsql } from './review_dashboard_esql';

describe('lintDashboardVisualizationEsql', () => {
  it('flags DATE_TRUNC on a Lens panel without requiring @timestamp', () => {
    const problems = lintDashboardVisualizationEsql({
      title: 'Logs',
      panels: [
        {
          type: 'lens',
          id: 'x1',
          grid: { x: 0, y: 0, w: 48, h: 10 },
          config: {
            type: 'xy',
            data_source: {
              type: 'esql',
              query:
                'FROM logs | STATS count = COUNT() BY bucket = DATE_TRUNC(1 hour, event.ingested)',
            },
          },
        },
      ],
    });

    expect(problems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          topic: ESQL_REVIEW_TOPIC,
          severity: 'miss',
          panel_id: 'x1',
        }),
      ])
    );
    expect(problems.some((problem) => problem.detail.includes('DATE_TRUNC'))).toBe(true);
  });

  it('does not flag a correctly auto-bucketed time series', () => {
    expect(
      lintDashboardVisualizationEsql({
        title: 'Logs',
        panels: [
          {
            type: 'lens',
            id: 'x1',
            grid: { x: 0, y: 0, w: 48, h: 10 },
            config: {
              type: 'xy',
              data_source: {
                type: 'esql',
                query:
                  'FROM logs | STATS count = COUNT() BY bucket = BUCKET(event.ingested, 75, ?_tstart, ?_tend)',
              },
            },
          },
        ],
      })
    ).toEqual([]);
  });
});
