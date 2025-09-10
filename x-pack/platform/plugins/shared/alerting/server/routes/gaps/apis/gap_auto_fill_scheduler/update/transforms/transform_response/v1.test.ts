/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformResponse } from './v1';
import type { GapFillAutoSchedulerResponse } from '../../../../../../../application/gap_auto_fill_scheduler/result/types';

describe('transformResponse v1 - update', () => {
  it('should transform update response correctly', () => {
    const mockResponse: GapFillAutoSchedulerResponse = {
      id: 'test-scheduler-id',
      name: 'Updated Test Scheduler',
      enabled: false,
      schedule: { interval: '2h' },
      rulesFilter: { tags: ['updated'] },
      gapFillRange: '48h',
      maxAmountOfGapsToProcessPerRun: 200,
      maxAmountOfRulesToProcessPerRun: 100,
      amountOfRetries: 5,
      createdBy: 'test-user',
      updatedBy: 'admin-user',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      lastRun: {
        timestamp: '2024-01-01T18:00:00.000Z',
        status: 'success',
        gapsProcessed: 10,
        rulesProcessed: 3,
        duration: 2500,
      },
      scheduledTaskId: 'updated-task-id',
    };

    const result = transformResponse(mockResponse);

    expect(result).toEqual({
      id: 'test-scheduler-id',
      name: 'Updated Test Scheduler',
      enabled: false,
      schedule: { interval: '2h' },
      rules_filter: { tags: ['updated'] },
      gap_fill_range: '48h',
      max_amount_of_gaps_to_process_per_run: 200,
      max_amount_of_rules_to_process_per_run: 100,
      amount_of_retries: 5,
      created_by: 'test-user',
      updated_by: 'admin-user',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-02T00:00:00.000Z',
      last_run: {
        timestamp: '2024-01-01T18:00:00.000Z',
        status: 'success',
        gapsProcessed: 10,
        rulesProcessed: 3,
        duration: 2500,
      },
      scheduled_task_id: 'updated-task-id',
    });
  });
});
