/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import { getMockCallWithInternal, getMockKbnServer, getMockTaskFetch } from '../test_utils';
import { buildCollectorObj } from './maps_usage_collector';

describe('buildCollectorObj#fetch', () => {
  let mockKbnServer;

  beforeEach(() => {
    mockKbnServer = getMockKbnServer();
  });

  test('can return empty stats', async () => {
    const { type, fetch } = buildCollectorObj(mockKbnServer);
    expect(type).toBe('maps');
    const fetchResult = await fetch();
    expect(fetchResult).toEqual({});
  });

  test('provides known stats', async () => {
    const mockTaskFetch = getMockTaskFetch([
      {
        state: {
          runs: 2,
          stats: { wombat_sightings: { total: 712, max: 84, min: 7, avg: 63 } },
        },
      },
    ]);
    mockKbnServer = getMockKbnServer(getMockCallWithInternal(), mockTaskFetch);

    const { type, fetch } = buildCollectorObj(mockKbnServer);
    expect(type).toBe('maps');
    const fetchResult = await fetch();
    expect(fetchResult).toEqual({ wombat_sightings: { total: 712, max: 84, min: 7, avg: 63 } });
  });

  describe('Error handling', () => {
    test('Silently handles Task Manager NotInitialized', async () => {
      const mockTaskFetch = sinon.stub();
      mockTaskFetch.rejects(
        new Error('NotInitialized taskManager is still waiting for plugins to load')
      );
      mockKbnServer = getMockKbnServer(getMockCallWithInternal(), mockTaskFetch);

      const { fetch } = buildCollectorObj(mockKbnServer);
      await expect(fetch()).resolves.toBe(undefined);
    });
    // In real life, the CollectorSet calls fetch and handles errors
    test('defers the errors', async () => {
      const mockTaskFetch = sinon.stub();
      mockTaskFetch.rejects(new Error('Sad violin'));
      mockKbnServer = getMockKbnServer(getMockCallWithInternal(), mockTaskFetch);

      const { fetch } = buildCollectorObj(mockKbnServer);
      await expect(fetch()).rejects.toMatchObject(new Error('Sad violin'));
    });
  });
});
