/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UIAM_PROVISIONING_FETCH_RUN_AT_GT } from '../constants';
import { buildUiamProvisioningFetchQuery } from './deferred_non_running_tasks_query';

describe('buildUiamProvisioningFetchQuery', () => {
  it('matches deferred runAt or disabled tasks, excluding running', () => {
    expect(buildUiamProvisioningFetchQuery()).toEqual({
      bool: {
        must_not: [{ term: { 'task.status': 'running' } }],
        must: [
          {
            bool: {
              should: [
                { range: { 'task.runAt': { gt: UIAM_PROVISIONING_FETCH_RUN_AT_GT } } },
                { term: { 'task.enabled': false } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });

  it('excludes task documents by id when final-status entity ids are provided', () => {
    expect(
      buildUiamProvisioningFetchQuery({
        excludeTaskEntityIdsWithFinalStatus: ['a', 'b'],
      })
    ).toEqual({
      bool: {
        must: [
          {
            bool: {
              must_not: [{ term: { 'task.status': 'running' } }],
              must: [
                {
                  bool: {
                    should: [
                      { range: { 'task.runAt': { gt: UIAM_PROVISIONING_FETCH_RUN_AT_GT } } },
                      { term: { 'task.enabled': false } },
                    ],
                    minimum_should_match: 1,
                  },
                },
              ],
            },
          },
        ],
        must_not: [
          {
            bool: {
              should: [{ ids: { values: ['task:a', 'task:b'] } }],
              minimum_should_match: 1,
            },
          },
        ],
      },
    });
  });
});
