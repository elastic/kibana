/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { transformRequest } from './v1';

describe('transformRequest()', () => {
  it('converts snake_case payload to camelCase update params', () => {
    const request = httpServerMock.createKibanaRequest({
      method: 'put',
      path: '/internal/alerting/rules/gaps/auto_fill_scheduler/scheduler-1',
      params: {
        id: 'scheduler-1',
      },
      body: {
        name: 'scheduler',
        enabled: false,
        gap_fill_range: 'now-30d',
        max_backfills: 200,
        num_retries: 5,
        schedule: { interval: '1h' },
        scope: ['scope-a'],
        rule_types: [{ type: 'rule-type', consumer: 'alertsFixture' }],
      },
    });

    const result = transformRequest(request);

    expect(result).toEqual({
      id: 'scheduler-1',
      name: 'scheduler',
      enabled: false,
      gapFillRange: 'now-30d',
      maxBackfills: 200,
      numRetries: 5,
      schedule: { interval: '1h' },
      scope: ['scope-a'],
      ruleTypes: [{ type: 'rule-type', consumer: 'alertsFixture' }],
      request,
    });
  });
});
