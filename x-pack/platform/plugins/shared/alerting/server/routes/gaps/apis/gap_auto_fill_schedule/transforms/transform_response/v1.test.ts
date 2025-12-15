/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GapAutoFillSchedulerResponse } from '../../../../../../application/gap_auto_fill_scheduler/result/types';
import { transformToGapAutoFillSchedulerResponseBody } from './v1';

describe('transformToGapAutoFillSchedulerResponseBody', () => {
  const mockResult: GapAutoFillSchedulerResponse = {
    id: 'test-scheduler-id',
    name: 'Test Scheduler',
    enabled: true,
    schedule: { interval: '1h' },
    gapFillRange: '24h',
    maxBackfills: 100,
    numRetries: 3,
    createdBy: 'test-user',
    updatedBy: 'test-user',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ruleTypes: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
    scope: ['internal'],
  };

  it('transforms scheduler correctly to V1 response body', () => {
    const result = transformToGapAutoFillSchedulerResponseBody(mockResult);
    expect(result).toEqual({
      id: 'test-scheduler-id',
      name: 'Test Scheduler',
      enabled: true,
      schedule: { interval: '1h' },
      gap_fill_range: '24h',
      max_backfills: 100,
      num_retries: 3,
      created_by: 'test-user',
      updated_by: 'test-user',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      rule_types: [{ type: 'test-rule-type', consumer: 'test-consumer' }],
      scope: ['internal'],
    });
  });
});
