/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { transformRequest } from './v1';

describe('transformRequest v1 - create', () => {
  it('should transform create request correctly', () => {
    const mockRequest = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/internal/alerting/rules/gaps/gap_auto_fill_scheduler',
      body: {
        id: 'test-scheduler-id',
        name: 'Test Scheduler',
        enabled: true,
        schedule: { interval: '1h' },
        rules_filter: { tags: ['test'] },
        gap_fill_range: '24h',
        max_amount_of_gaps_to_process_per_run: 100,
        max_amount_of_rules_to_process_per_run: 50,
        amount_of_retries: 3,
        scope: 'internal',
        rule_types: [
          { type: 'test-rule-type', consumer: 'test-consumer' },
          { type: 'another-rule-type', consumer: 'another-consumer' },
        ],
      },
    });

    const result = transformRequest(mockRequest);

    expect(result).toEqual({
      id: 'test-scheduler-id',
      name: 'Test Scheduler',
      enabled: true,
      schedule: { interval: '1h' },
      rulesFilter: { tags: ['test'] },
      gapFillRange: '24h',
      maxAmountOfGapsToProcessPerRun: 100,
      maxAmountOfRulesToProcessPerRun: 50,
      amountOfRetries: 3,
      scope: 'internal',
      ruleTypes: [
        { type: 'test-rule-type', consumer: 'test-consumer' },
        { type: 'another-rule-type', consumer: 'another-consumer' },
      ],
      request: mockRequest,
    });
  });
});
