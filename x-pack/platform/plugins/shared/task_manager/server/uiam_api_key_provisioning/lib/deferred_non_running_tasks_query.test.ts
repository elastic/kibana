/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildUiamProvisioningFetchQuery } from './deferred_non_running_tasks_query';

describe('buildUiamProvisioningFetchQuery', () => {
  const runAtAfterIso = '2026-01-01T00:00:30.000Z';

  it('matches deferred runAt or disabled tasks, excluding running', () => {
    expect(buildUiamProvisioningFetchQuery(runAtAfterIso)).toEqual({
      bool: {
        must_not: [{ term: { 'task.status': 'running' } }],
        must: [
          {
            bool: {
              should: [
                { range: { 'task.runAt': { gt: runAtAfterIso } } },
                { term: { 'task.enabled': false } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });
});
