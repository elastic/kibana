/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { executeEsql } from '@kbn/agent-builder-genai-utils/tools/utils/esql';
import { judgeDashboard } from './judge';
import { reviewDashboard } from './review_dashboard';

jest.mock('@kbn/agent-builder-genai-utils/tools/utils/esql', () => ({
  executeEsql: jest.fn(),
  buildTimeRangeParams: jest.fn().mockReturnValue([]),
}));

jest.mock('./judge', () => ({
  judgeDashboard: jest.fn(),
}));

const createLogger = (): Logger => ({ debug: jest.fn(), info: jest.fn() } as unknown as Logger);

const createEsClient = (fieldCaps: jest.Mock): IScopedClusterClient =>
  ({ asCurrentUser: { fieldCaps } } as unknown as IScopedClusterClient);

const createDashboard = (query: string): DashboardAttachmentData => ({
  title: 'Time field review',
  time_range: {
    from: '2026-08-01T00:00:00.000Z',
    to: '2026-08-02T00:00:00.000Z',
  },
  panels: [
    {
      id: 'panel-1',
      type: LENS_EMBEDDABLE_TYPE,
      grid: { x: 0, y: 0, w: 24, h: 12 },
      config: { type: 'metric', data_source: { type: 'esql', query } },
    },
  ],
});

describe('reviewDashboard time filtering', () => {
  beforeEach(() => {
    jest.mocked(executeEsql).mockResolvedValue({ columns: [], values: [] });
    jest.mocked(judgeDashboard).mockResolvedValue({
      overall_assessment: 'ok',
      findings: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('filters on the real time field referenced by the panel query', async () => {
    const fieldCaps = jest.fn();
    const query =
      'FROM logs-* | WHERE event.created >= ?_tstart AND event.created < ?_tend | STATS count = COUNT(*)';

    await reviewDashboard({
      dashboardData: createDashboard(query),
      version: 1,
      focus: undefined,
      esClient: createEsClient(fieldCaps),
      modelProvider: {} as ModelProvider,
      logger: createLogger(),
    });

    expect(fieldCaps).not.toHaveBeenCalled();
    expect(executeEsql).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: {
          bool: {
            filter: [
              {
                range: {
                  'event.created': {
                    gte: '2026-08-01T00:00:00.000Z',
                    lte: '2026-08-02T00:00:00.000Z',
                    format: 'strict_date_optional_time',
                  },
                },
              },
            ],
            must: [],
            must_not: [],
            should: [],
          },
        },
      })
    );
  });

  it('does not invent a range filter for a time-independent source', async () => {
    const fieldCaps = jest.fn().mockResolvedValue({ fields: {} });

    await reviewDashboard({
      dashboardData: createDashboard('FROM lookup-data | KEEP id, name'),
      version: 1,
      focus: undefined,
      esClient: createEsClient(fieldCaps),
      modelProvider: {} as ModelProvider,
      logger: createLogger(),
    });

    expect(executeEsql).toHaveBeenCalledWith(expect.objectContaining({ filter: undefined }));
  });

  it('combines the dashboard query and filters with the time range', async () => {
    const dashboardData = createDashboard(
      'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend'
    );
    dashboardData.query = { expression: 'service.name: checkout', language: 'kql' };
    dashboardData.filters = [
      {
        type: 'dsl',
        dsl: { query: { term: { environment: 'production' } } },
      },
    ];

    await reviewDashboard({
      dashboardData,
      version: 1,
      focus: undefined,
      esClient: createEsClient(jest.fn()),
      modelProvider: {} as ModelProvider,
      logger: createLogger(),
    });

    const executionFilter = jest.mocked(executeEsql).mock.calls[0][0].filter;
    expect(executionFilter).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          filter: expect.arrayContaining([
            { term: { environment: 'production' } },
            { range: { '@timestamp': expect.any(Object) } },
          ]),
        }),
      })
    );
    expect(JSON.stringify(executionFilter)).toContain('service.name');
    expect(JSON.stringify(executionFilter)).toContain('checkout');
  });

  it('honors Lens layers that ignore global filters', async () => {
    const query = 'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend';
    const dashboardData = createDashboard(query);
    dashboardData.query = { expression: 'service.name: checkout', language: 'kql' };
    dashboardData.filters = [
      {
        type: 'dsl',
        dsl: { query: { term: { environment: 'production' } } },
      },
    ];
    (dashboardData.panels[0] as AttachmentPanel).config = {
      type: 'xy',
      layers: [{ data_source: { type: 'esql', query }, ignore_global_filters: true }],
    };

    await reviewDashboard({
      dashboardData,
      version: 1,
      focus: undefined,
      esClient: createEsClient(jest.fn()),
      modelProvider: {} as ModelProvider,
      logger: createLogger(),
    });

    const executionFilter = jest.mocked(executeEsql).mock.calls[0][0].filter;
    expect(executionFilter).toEqual({
      bool: {
        filter: [{ range: { '@timestamp': expect.any(Object) } }],
        must: [],
        must_not: [],
        should: [],
      },
    });
    expect(JSON.stringify(executionFilter)).not.toContain('checkout');
    expect(JSON.stringify(executionFilter)).not.toContain('production');
  });
});
