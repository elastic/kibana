/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { getGapAutoFillSchedulerTelemetryPerDay } from './get_gap_auto_fill_scheduler_telemetry';

describe('getGapAutoFillSchedulerTelemetryPerDay', () => {
  it('parses aggregations including nested processed gaps sum', async () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({
        hits: { total: { value: 3 } },
        aggregations: {
          by_status: {
            buckets: [
              { key: 'success', doc_count: 2 },
              { key: 'no_gaps', doc_count: 1 },
            ],
          },
          duration_ms: { min: 10, max: 50, avg: 30, sum: 90 },
          unique_rule_count: { value: 5 },
          results_nested: {
            doc_count: 2,
            processed_gaps_total: { value: 11 },
            by_result_status: {
              buckets: [
                { key: 'success', doc_count: 2 },
                { key: 'error', doc_count: 0 },
              ],
            },
          },
        },
      }),
    } as unknown as ElasticsearchClient;

    const res = await getGapAutoFillSchedulerTelemetryPerDay({
      esClient,
      eventLogIndex: '.kibana-event-log-*',
      logger: {
        warn: jest.fn(),
        debug: jest.fn(),
        isLevelEnabled: jest.fn().mockReturnValue(false),
      } as unknown as Logger,
    });

    expect(res.hasErrors).toBe(false);
    expect(res.runsTotal).toBe(3);
    expect(res.runsByStatus).toEqual({ success: 2, no_gaps: 1 });
    expect(res.durationMs).toEqual({ min: 10, max: 50, avg: 30, sum: 90 });
    expect(res.uniqueRuleCount).toBe(5);
    expect(res.processedGapsTotal).toBe(11);
    expect(res.resultsByStatus).toEqual({ success: 2, error: 0 });
  });
});
