/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  asUpdateByQuery,
  shouldBeOneOf,
  mustBeAllOf,
  ExistsBoolClause,
  TermBoolClause,
  RangeBoolClause,
} from './query_clauses';

import {
  updateFields,
  IdleTaskWithExpiredRunAt,
  RunningOrClaimingTaskWithExpiredRetryAt,
  RecuringTaskWithInterval,
  taskWithLessThanMaxAttempts,
  SortByRunAtAndRetryAt,
} from './mark_available_tasks_as_claimed';

import { TaskDictionary, TaskDefinition } from '../task';

describe('mark_available_tasks_as_claimed', () => {
  test('generates query matching tasks to be claimed when polling for tasks', () => {
    const definitions: TaskDictionary<TaskDefinition> = {
      sampleTask: {
        type: 'sampleTask',
        title: 'title',
        maxAttempts: 5,
        createTaskRunner: () => ({ run: () => Promise.resolve() }),
      },
      otherTask: {
        type: 'otherTask',
        title: 'title',
        createTaskRunner: () => ({ run: () => Promise.resolve() }),
      },
    };
    const defaultMaxAttempts = 1;
    const taskManagerId = '3478fg6-82374f6-83467gf5-384g6f';
    const claimOwnershipUntil = '2019-02-12T21:01:22.479Z';

    expect(
      asUpdateByQuery({
        query: mustBeAllOf(
          // Either a task with idle status and runAt <= now or
          // status running or claiming with a retryAt <= now.
          shouldBeOneOf(IdleTaskWithExpiredRunAt, RunningOrClaimingTaskWithExpiredRetryAt),
          // Either task has an interval or the attempts < the maximum configured
          shouldBeOneOf<ExistsBoolClause | TermBoolClause | RangeBoolClause>(
            RecuringTaskWithInterval,
            ...Object.entries(definitions).map(([type, { maxAttempts }]) =>
              taskWithLessThanMaxAttempts(type, maxAttempts || defaultMaxAttempts)
            )
          )
        ),
        update: updateFields({
          ownerId: taskManagerId,
          status: 'claiming',
          retryAt: claimOwnershipUntil,
        }),
        sort: SortByRunAtAndRetryAt,
      })
    ).toEqual({
      query: {
        bool: {
          must: [
            // Either a task with idle status and runAt <= now or
            // status running or claiming with a retryAt <= now.
            {
              bool: {
                should: [
                  {
                    bool: {
                      must: [
                        { term: { 'task.status': 'idle' } },
                        { range: { 'task.runAt': { lte: 'now' } } },
                      ],
                    },
                  },
                  {
                    bool: {
                      must: [
                        {
                          bool: {
                            should: [
                              { term: { 'task.status': 'running' } },
                              { term: { 'task.status': 'claiming' } },
                            ],
                          },
                        },
                        { range: { 'task.retryAt': { lte: 'now' } } },
                      ],
                    },
                  },
                ],
              },
            },
            // Either task has an interval or the attempts < the maximum configured
            {
              bool: {
                should: [
                  { exists: { field: 'task.interval' } },
                  {
                    bool: {
                      must: [
                        { term: { 'task.taskType': 'sampleTask' } },
                        {
                          range: {
                            'task.attempts': {
                              lt: 5,
                            },
                          },
                        },
                      ],
                    },
                  },
                  {
                    bool: {
                      must: [
                        { term: { 'task.taskType': 'otherTask' } },
                        {
                          range: {
                            'task.attempts': {
                              lt: 1,
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      sort: {
        _script: {
          type: 'number',
          order: 'asc',
          script: {
            lang: 'painless',
            source: `
if (doc['task.retryAt'].size()!=0) {
  return doc['task.retryAt'].value.toInstant().toEpochMilli();
}
if (doc['task.runAt'].size()!=0) {
  return doc['task.runAt'].value.toInstant().toEpochMilli();
}
    `,
          },
        },
      },
      seq_no_primary_term: true,
      script: {
        source: `ctx._source.task.ownerId=params.ownerId; ctx._source.task.status=params.status; ctx._source.task.retryAt=params.retryAt;`,
        lang: 'painless',
        params: {
          ownerId: taskManagerId,
          retryAt: claimOwnershipUntil,
          status: 'claiming',
        },
      },
    });
  });
});
