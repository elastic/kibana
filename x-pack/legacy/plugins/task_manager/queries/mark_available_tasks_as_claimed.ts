/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BoolClause,
  SortClause,
  ScriptClause,
  ExistsBoolClause,
  TermBoolClause,
  RangeBoolClause,
} from './query_clauses';

export const RecuringTaskWithInterval: ExistsBoolClause = { exists: { field: 'task.interval' } };
export function taskWithLessThanMaxAttempts(
  type: string,
  maxAttempts: number
): BoolClause<TermBoolClause | RangeBoolClause> {
  return {
    bool: {
      must: [
        { term: { 'task.taskType': type } },
        {
          range: {
            'task.attempts': {
              lt: maxAttempts,
            },
          },
        },
      ],
    },
  };
}

export const IdleTaskWithExpiredRunAt: BoolClause<TermBoolClause | RangeBoolClause> = {
  bool: {
    must: [{ term: { 'task.status': 'idle' } }, { range: { 'task.runAt': { lte: 'now' } } }],
  },
};

export const RunningOrClaimingTaskWithExpiredRetryAt: BoolClause<
  TermBoolClause | RangeBoolClause
> = {
  bool: {
    must: [
      {
        bool: {
          should: [{ term: { 'task.status': 'running' } }, { term: { 'task.status': 'claiming' } }],
        },
      },
      { range: { 'task.retryAt': { lte: 'now' } } },
    ],
  },
};

export const SortByRunAtAndRetryAt: SortClause = {
  _script: {
    type: 'number',
    order: 'asc',
    script: {
      lang: 'expression',
      source: `doc['task.retryAt'].value || doc['task.runAt'].value`,
    },
  },
};

export const updateFields = (fieldUpdates: {
  [field: string]: string | number | Date;
}): ScriptClause => ({
  source: Object.keys(fieldUpdates)
    .map(field => `ctx._source.task.${field}=params.${field};`)
    .join(' '),
  lang: 'painless',
  params: fieldUpdates,
});
