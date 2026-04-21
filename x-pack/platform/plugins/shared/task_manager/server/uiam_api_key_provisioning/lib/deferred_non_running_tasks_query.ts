/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tasks eligible for UIAM API key background conversion:
 * - Not in `running` status, and
 * - Either `runAt` is after the buffer (so an enabled task will not be claimed for execution
 *   imminently), or the task is **disabled** (Task Manager does not claim disabled tasks, so
 *   there is no race with execution regardless of `runAt`).
 */
export const buildUiamProvisioningFetchQuery = (runAtAfterIso: string) => ({
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
