/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMockTaskFetch, getMockTaskManager } from '../../../../test_utils';
import { getUsageCollector } from './get_usage_collector';

describe('getVisualizationsCollector#fetch', () => {
  test('can return empty stats', async () => {
    const { type, fetch } = getUsageCollector(getMockTaskManager());
    expect(type).toBe('visualization_types');
    const fetchResult = await fetch();
    expect(fetchResult).toEqual({});
  });

  test('provides known stats', async () => {
    const mockTaskFetch = getMockTaskFetch([
      {
        state: {
          runs: 1,
          stats: { comic_books: { total: 16, max: 12, min: 2, avg: 6 } },
        },
        taskType: 'test',
        params: {},
      },
    ]);
    const { type, fetch } = getUsageCollector(getMockTaskManager(mockTaskFetch));
    expect(type).toBe('visualization_types');
    const fetchResult = await fetch();
    expect(fetchResult).toEqual({ comic_books: { avg: 6, max: 12, min: 2, total: 16 } });
  });

  describe('Error handling', () => {
    test('Silently handles Task Manager NotInitialized', async () => {
      const mockTaskFetch = jest.fn(() => {
        throw new Error('NotInitialized taskManager is still waiting for plugins to load');
      });
      const { fetch } = getUsageCollector(getMockTaskManager(mockTaskFetch));
      const result = await fetch();
      expect(result).toBe(undefined);
    });
    // In real life, the CollectorSet calls fetch and handles errors
    test('defers the errors', async () => {
      const mockTaskFetch = jest.fn(() => {
        throw new Error('BOOM');
      });

      const { fetch } = getUsageCollector(getMockTaskManager(mockTaskFetch));
      await expect(fetch()).rejects.toThrowErrorMatchingInlineSnapshot(`"BOOM"`);
    });
  });
});
