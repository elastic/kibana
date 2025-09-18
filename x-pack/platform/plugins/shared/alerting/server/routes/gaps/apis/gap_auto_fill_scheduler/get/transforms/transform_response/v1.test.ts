/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformResponse } from './v1';
import type { GapFillAutoSchedulerResponse } from '../../../../../../../application/gap_auto_fill_scheduler/result/types';

describe('transformResponse v1 - get', () => {
  it('should transform get response correctly', () => {
    const mockResponse: GapFillAutoSchedulerResponse = {
      id: 'test-scheduler-id',
      name: 'Test Scheduler',
      enabled: true,
      schedule: { interval: '1h' },
      rulesFilter: { tags: ['test'] },
      gapFillRange: '24h',
      maxAmountOfGapsToProcessPerRun: 100,
      maxAmountOfRulesToProcessPerRun: 50,
      amountOfRetries: 3,
      createdBy: 'test-user',
      updatedBy: 'test-user',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      scheduledTaskId: 'task-id-123',
    };

    const result = transformResponse(mockResponse);

    expect(result).toEqual({
      id: 'test-scheduler-id',
      name: 'Test Scheduler',
      enabled: true,
      schedule: { interval: '1h' },
      rules_filter: { tags: ['test'] },
      gap_fill_range: '24h',
      max_amount_of_gaps_to_process_per_run: 100,
      max_amount_of_rules_to_process_per_run: 50,
      amount_of_retries: 3,
      created_by: 'test-user',
      updated_by: 'test-user',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
      scheduled_task_id: 'task-id-123',
    });
  });
});
