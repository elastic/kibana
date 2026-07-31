/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toCountNewExecutionEventsRequest } from './use_count_new_execution_history_events';

describe('toCountNewExecutionEventsRequest', () => {
  it('maps camelCase view state to the snake_case request (including since)', () => {
    expect(
      toCountNewExecutionEventsRequest({
        since: '2026-01-01T00:00:00.000Z',
        search: 'bar',
        ruleIds: ['rule-1'],
        outcome: 'throttled',
      })
    ).toEqual({
      since: '2026-01-01T00:00:00.000Z',
      search: 'bar',
      rule_ids: ['rule-1'],
      outcome: 'throttled',
    });
  });
});
