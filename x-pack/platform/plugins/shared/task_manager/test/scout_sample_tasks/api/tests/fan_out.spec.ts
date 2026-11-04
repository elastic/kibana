/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

const HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
} as const;

const TEST_RESULT_INDEX = '.kibana_task_manager_test_result';

interface TaskBody {
  id?: string;
  status?: string;
  attempts?: number;
  parentId?: string;
  rootId?: string;
  depth?: number;
  childKey?: string;
  hasChildren?: boolean;
  state?: Record<string, unknown>;
  statusCode?: number;
}

interface FanOutResult {
  wakes: number;
  done: number;
  failed: number;
  cancelled: number;
  missing: number;
  results: Array<{ key: string; outcome: string; result: string | null }>;
}

apiTest.describe('Task Manager sub-tasks (fan-out)', { tag: ['@local-stateful-classic'] }, () => {
  apiTest(
    'spawns children, is woken when they end, joins their results and removes them',
    async ({ apiClient, samlAuth, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const headers = { ...HEADERS, ...cookieHeader };

      const getTask = async (taskId: string): Promise<TaskBody> => {
        const response = await apiClient.get(`api/sample_tasks/task/${taskId}`, {
          headers,
          responseType: 'json',
        });
        return response.body as TaskBody;
      };

      const scheduled = await apiClient.post('api/sample_tasks/schedule', {
        headers,
        body: {
          task: {
            taskType: 'sampleFanOutParent',
            params: {
              children: 3,
              failChildren: ['child-1'],
              // Long enough that the join can only finish this fast when the children wake the parent
              joinDelay: '10m',
            },
            state: {},
          },
        },
        responseType: 'json',
      });
      expect(scheduled).toHaveStatusCode(200);
      const parentId = (scheduled.body as TaskBody).id;
      expect(typeof parentId).toBe('string');

      // Children are created with deterministic ids and linked to the parent
      await expect
        .poll(() => getTask(`${parentId}:child-0`), { timeout: 60_000 })
        .toMatchObject({
          id: `${parentId}:child-0`,
          parentId,
          rootId: parentId,
          depth: 1,
          childKey: 'child-0',
        });

      // The parent yields after spawning and records that it has children
      await expect
        .poll(async () => {
          const parent = await getTask(parentId!);
          return parent.statusCode === 404 ? { status: 'gone' } : parent;
        })
        .toMatchObject(
          expect.objectContaining({
            hasChildren: true,
          })
        );

      // The children end and are kept in a terminal status with their result for the parent
      await expect
        .poll(() => getTask(`${parentId}:child-0`), { timeout: 60_000 })
        .toMatchObject(
          expect.objectContaining({
            state: expect.objectContaining({ result: 'CHILD-0' }),
          })
        );

      // The parent is woken by its children (well before the 10m deadline), joins, and finishes:
      // the parent and every child are removed.
      await expect
        .poll(() => getTask(parentId!), { timeout: 90_000 })
        .toMatchObject({ statusCode: 404 });
      for (const key of ['child-0', 'child-1', 'child-2']) {
        await expect
          .poll(() => getTask(`${parentId}:${key}`), { timeout: 30_000 })
          .toMatchObject({ statusCode: 404 });
      }

      // The join saw every child's outcome
      const results = await esClient.search<{ type: string; taskId: string; state: string }>({
        index: TEST_RESULT_INDEX,
        query: { bool: { filter: [{ term: { type: 'fanOut' } }, { term: { taskId: parentId } }] } },
      });
      expect(results.hits.hits).toHaveLength(1);
      const result = JSON.parse(results.hits.hits[0]._source!.state) as FanOutResult;
      expect(result).toMatchObject({ done: 2, failed: 1, cancelled: 0, missing: 0 });
      expect(result.results).toMatchObject(
        expect.arrayContaining([
          { key: 'child-0', outcome: 'done', result: 'CHILD-0' },
          { key: 'child-1', outcome: 'failed', result: null },
          { key: 'child-2', outcome: 'done', result: 'CHILD-2' },
        ])
      );
      // Wake-ups coalesce: three children never cost more than a handful of parent runs
      expect(result.wakes).toBeGreaterThanOrEqual(1);
      expect(result.wakes).toBeLessThanOrEqual(4);
    }
  );

  apiTest(
    'failFast cancels the remaining children when one fails',
    async ({ apiClient, samlAuth, esClient }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser('admin');
      const headers = { ...HEADERS, ...cookieHeader };

      const scheduled = await apiClient.post('api/sample_tasks/schedule', {
        headers,
        body: {
          task: {
            taskType: 'sampleFanOutParent',
            params: {
              children: 4,
              failChildren: ['child-0'],
              // child-0 fails at once while its slow siblings are still pending or running
              childDelayMs: 20_000,
              policy: 'failFast',
              joinDelay: '10m',
            },
            state: {},
          },
        },
        responseType: 'json',
      });
      expect(scheduled).toHaveStatusCode(200);
      const parentId = (scheduled.body as TaskBody).id!;

      await expect
        .poll(
          async () => {
            const results = await esClient.search<{ state: string }>({
              index: TEST_RESULT_INDEX,
              query: {
                bool: { filter: [{ term: { type: 'fanOut' } }, { term: { taskId: parentId } }] },
              },
            });
            return results.hits.hits.length
              ? (JSON.parse(results.hits.hits[0]._source!.state) as FanOutResult)
              : undefined;
          },
          { timeout: 120_000 }
        )
        .toMatchObject(expect.objectContaining({ failed: 1 }));

      const results = await esClient.search<{ state: string }>({
        index: TEST_RESULT_INDEX,
        query: { bool: { filter: [{ term: { type: 'fanOut' } }, { term: { taskId: parentId } }] } },
      });
      const result = JSON.parse(results.hits.hits[0]._source!.state) as FanOutResult;
      // The three siblings were either removed before they ran (missing) or stopped while running
      // (cancelled); none of them completed.
      expect(result.done).toBe(0);
      expect(result.cancelled + result.missing).toBe(3);
    }
  );
});
