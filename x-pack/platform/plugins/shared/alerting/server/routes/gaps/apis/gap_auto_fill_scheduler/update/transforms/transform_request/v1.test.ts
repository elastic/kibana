/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { transformRequest } from './v1';

describe('transformRequest v1 - update', () => {
  it('should transform update request correctly', () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'put',
      path: '/internal/alerting/rules/gaps/gap_auto_fill_scheduler/test-id',
      params: { id: 'test-scheduler-id' },
      body: {
        name: 'Updated Test Scheduler',
        enabled: false,
        schedule: { interval: '2h' },
        rules_filter: { tags: ['updated'] },
        gap_fill_range: '48h',
        max_amount_of_gaps_to_process_per_run: 200,
        max_amount_of_rules_to_process_per_run: 100,
        amount_of_retries: 5,
      },
    });

    const result = transformRequest(mockRequest);

    expect(result).toEqual({
      id: 'test-scheduler-id',
      updates: {
        name: 'Updated Test Scheduler',
        enabled: false,
        schedule: { interval: '2h' },
        rulesFilter: { tags: ['updated'] },
        gapFillRange: '48h',
        maxAmountOfGapsToProcessPerRun: 200,
        maxAmountOfRulesToProcessPerRun: 100,
        amountOfRetries: 5,
      },
    });
  });
});
