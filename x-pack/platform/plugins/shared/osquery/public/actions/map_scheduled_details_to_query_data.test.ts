/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduledExecutionDetailsItem } from './use_scheduled_execution_details';
import { mapScheduledDetailsToQueryData } from './use_scheduled_execution_details';

const createDetailsItem = (
  overrides: Partial<ScheduledExecutionDetailsItem> = {}
): ScheduledExecutionDetailsItem => ({
  scheduleId: 'sched-1',
  executionCount: 5,
  packId: 'pack-1',
  packName: 'My Pack',
  queryName: 'uptime_query',
  queryText: 'SELECT * FROM uptime;',
  timestamp: '2026-03-11T12:00:00.000Z',
  agentCount: 3,
  successCount: 2,
  errorCount: 1,
  totalRows: 42,
  ...overrides,
});

describe('mapScheduledDetailsToQueryData', () => {
  it('should map all fields correctly', () => {
    const data = createDetailsItem();
    const result = mapScheduledDetailsToQueryData(data, 'sched-1');

    expect(result).toEqual([
      {
        action_id: 'sched-1',
        id: 'uptime_query',
        query: 'SELECT * FROM uptime;',
        agents: [],
        status: 'completed',
        docs: 42,
        successful: 2,
        failed: 1,
        pending: 0,
      },
    ]);
  });

  it('should fall back to scheduleId when queryName is empty', () => {
    const data = createDetailsItem({ queryName: '' });
    const result = mapScheduledDetailsToQueryData(data, 'sched-fallback');

    expect(result[0].id).toBe('sched-fallback');
  });
});
