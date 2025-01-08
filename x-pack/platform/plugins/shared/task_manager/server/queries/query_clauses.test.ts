/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MustCondition, shouldBeOneOf, mustBeAllOf, matchesClauses } from './query_clauses';

describe('matchesClauses', () => {
  test('merges multiple types of Bool Clauses into one', () => {
    const TaskWithSchedule = {
      exists: { field: 'task.schedule' },
    };

    const IdleTaskWithExpiredRunAt: MustCondition = {
      bool: {
        must: [{ term: { 'task.status': 'idle' } }, { range: { 'task.runAt': { lte: 'now' } } }],
      },
    };

    const RunningTask: MustCondition = {
      bool: {
        must: [{ term: { 'task.status': 'running' } }],
      },
    };

    expect(
      matchesClauses(
        mustBeAllOf(TaskWithSchedule),
        undefined,
        shouldBeOneOf(RunningTask, IdleTaskWithExpiredRunAt)
      )
    ).toMatchObject({
      bool: {
        must: [TaskWithSchedule],
        should: [RunningTask, IdleTaskWithExpiredRunAt],
      },
    });
  });
});
