/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type {
  AttachmentPanel,
  DashboardSection,
  DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { applyDefaultDashboardTimeRange } from './apply_default_time_range';
import { extractEsqlQueries } from './dataset_probe';

const NOW = new Date('2026-06-26T12:00:00.000Z').getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

// Valid ES|QL: references @timestamp via ?_tstart/?_tend, so the time field is
// resolved from the query and no field_caps lookup is needed.
const Q_TIME_BOUND =
  'FROM logs-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS count = COUNT(*)';
// Valid ES|QL with no time param — the time field falls back to field_caps.
const Q_NO_PARAM = 'FROM events-* | STATS count = COUNT(*)';

const lensPanel = (id: string, config: Record<string, unknown>): AttachmentPanel => ({
  type: LENS_EMBEDDABLE_TYPE,
  id,
  config,
  grid: { x: 0, y: 0, w: 24, h: 15 },
});

const esqlPanel = (id: string, query: string): AttachmentPanel =>
  lensPanel(id, { type: 'metric', data_source: { type: 'esql', query } });

const markdownPanel = (id: string): AttachmentPanel => ({
  type: 'markdown',
  id,
  config: { content: '# notes' },
  grid: { x: 0, y: 0, w: 24, h: 15 },
});

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

const createEsClient = (overrides: {
  search?: jest.Mock;
  fieldCaps?: jest.Mock;
}): IScopedClusterClient =>
  ({
    asCurrentUser: {
      search: overrides.search ?? jest.fn(),
      fieldCaps: overrides.fieldCaps ?? jest.fn(),
    },
  } as unknown as IScopedClusterClient);

const minMaxResponse = (minMs: number | null, maxMs: number | null) => ({
  aggregations: { min_time: { value: minMs }, max_time: { value: maxMs } },
});

const dashboard = (
  panels: DashboardAttachmentData['panels'],
  extra: Partial<DashboardAttachmentData> = {}
): DashboardAttachmentData => ({ title: 'Test', panels, ...extra });

describe('applyDefaultDashboardTimeRange', () => {
  it('leaves an explicitly set time range untouched and never probes', async () => {
    const search = jest.fn();
    const dashboardData = dashboard([esqlPanel('p1', Q_TIME_BOUND)], {
      time_range: { from: 'now-7d', to: 'now' },
    });

    const result = await applyDefaultDashboardTimeRange({
      dashboardData,
      esClient: createEsClient({ search }),
      logger: createMockLogger(),
      nowMs: NOW,
    });

    expect(result).toBe(dashboardData);
    expect(search).not.toHaveBeenCalled();
  });

  it('does nothing when no panel is time-bound', async () => {
    const search = jest.fn();
    const result = await applyDefaultDashboardTimeRange({
      dashboardData: dashboard([markdownPanel('md')]),
      esClient: createEsClient({ search }),
      logger: createMockLogger(),
      nowMs: NOW,
    });

    expect(result.time_range).toBeUndefined();
    expect(search).not.toHaveBeenCalled();
  });

  it('sets a 24h relative range from the probed min/max for live data', async () => {
    const search = jest.fn().mockResolvedValue(minMaxResponse(NOW - 5 * DAY_MS, NOW));
    const fieldCaps = jest.fn();

    const result = await applyDefaultDashboardTimeRange({
      dashboardData: dashboard([esqlPanel('p1', Q_TIME_BOUND)]),
      esClient: createEsClient({ search, fieldCaps }),
      logger: createMockLogger(),
      nowMs: NOW,
    });

    expect(result.time_range).toEqual({ from: 'now-24h', to: 'now', mode: 'relative' });
    // time field came from the query, so no field_caps lookup
    expect(fieldCaps).not.toHaveBeenCalled();
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(expect.objectContaining({ index: 'logs-*' }));
  });

  it('discovers @timestamp via field_caps when the query has no time param', async () => {
    const fieldCaps = jest.fn().mockResolvedValue({ fields: { '@timestamp': { date: {} } } });
    const search = jest.fn().mockResolvedValue(minMaxResponse(NOW - 3 * DAY_MS, NOW));

    const result = await applyDefaultDashboardTimeRange({
      dashboardData: dashboard([esqlPanel('p1', Q_NO_PARAM)]),
      esClient: createEsClient({ search, fieldCaps }),
      logger: createMockLogger(),
      nowMs: NOW,
    });

    expect(result.time_range).toEqual({ from: 'now-24h', to: 'now', mode: 'relative' });
    expect(fieldCaps).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it('skips a dataset that has neither a time param nor @timestamp', async () => {
    const fieldCaps = jest.fn().mockResolvedValue({ fields: {} });
    const search = jest.fn();

    const result = await applyDefaultDashboardTimeRange({
      dashboardData: dashboard([esqlPanel('p1', Q_NO_PARAM)]),
      esClient: createEsClient({ search, fieldCaps }),
      logger: createMockLogger(),
      nowMs: NOW,
    });

    expect(result.time_range).toBeUndefined();
    expect(search).not.toHaveBeenCalled();
  });

  it('keeps the default when no dataset holds data', async () => {
    const search = jest.fn().mockResolvedValue(minMaxResponse(null, null));

    const result = await applyDefaultDashboardTimeRange({
      dashboardData: dashboard([esqlPanel('p1', Q_TIME_BOUND)]),
      esClient: createEsClient({ search }),
      logger: createMockLogger(),
      nowMs: NOW,
    });

    expect(result.time_range).toBeUndefined();
  });

  it('isolates a failing dataset and still computes from the healthy ones', async () => {
    const Q_METRICS =
      'FROM metrics-* | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend | STATS count = COUNT(*)';
    const search = jest
      .fn()
      .mockImplementation((params: { index: string }) =>
        params.index === 'logs-*'
          ? Promise.reject(new Error('index_not_found_exception'))
          : Promise.resolve(minMaxResponse(NOW - 5 * DAY_MS, NOW))
      );
    const logger = createMockLogger();

    const result = await applyDefaultDashboardTimeRange({
      dashboardData: dashboard([esqlPanel('p1', Q_TIME_BOUND), esqlPanel('p2', Q_METRICS)]),
      esClient: createEsClient({ search }),
      logger,
      nowMs: NOW,
    });

    expect(result.time_range).toEqual({ from: 'now-24h', to: 'now', mode: 'relative' });
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('fails soft and keeps the default when the only dataset probe errors', async () => {
    const search = jest.fn().mockRejectedValue(new Error('cluster_block_exception'));
    const logger = createMockLogger();

    const result = await applyDefaultDashboardTimeRange({
      dashboardData: dashboard([esqlPanel('p1', Q_TIME_BOUND)]),
      esClient: createEsClient({ search }),
      logger,
      nowMs: NOW,
    });

    // the failing probe is skipped, leaving no datasets, so today's default stays
    expect(result.time_range).toBeUndefined();
  });
});

describe('extractEsqlQueries', () => {
  it('collects queries from top-level, sections and XY layers, ignoring markdown and duplicates', () => {
    const xyPanel = lensPanel('xy', {
      type: 'xy',
      layers: [
        { data_source: { type: 'esql', query: 'FROM metrics-a' } },
        { data_source: { type: 'esql', query: 'FROM metrics-b' } },
      ],
    });
    const section: DashboardSection = {
      id: 'sec',
      title: 'Section',
      collapsed: false,
      grid: { y: 0 },
      panels: [
        esqlPanel('s1', Q_TIME_BOUND), // duplicate of the top-level panel
        esqlPanel('s2', 'FROM traces-*'),
      ],
    };

    const queries = extractEsqlQueries([
      esqlPanel('top', Q_TIME_BOUND),
      markdownPanel('md'),
      xyPanel,
      section,
    ]);

    expect(queries).toEqual([Q_TIME_BOUND, 'FROM metrics-a', 'FROM metrics-b', 'FROM traces-*']);
  });

  it('returns an empty array when there are no Lens panels', () => {
    expect(extractEsqlQueries([markdownPanel('md')])).toEqual([]);
  });
});
