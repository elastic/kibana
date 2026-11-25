/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSharedInvestigationsQueryClient } from './shared_query_client';

describe('getSharedInvestigationsQueryClient', () => {
  it('returns the same instance on every call, so the queue page and the flyout share one cache', async () => {
    const [first, second] = await Promise.all([
      getSharedInvestigationsQueryClient(),
      getSharedInvestigationsQueryClient(),
    ]);
    expect(first).toBe(second);
  });

  it('loads again after a failed load, and keeps the client the retry creates', async () => {
    // A fresh module graph, so the memoized client from the test above is not reused.
    await jest.isolateModulesAsync(async () => {
      const loadError = new Error('Loading chunk failed');
      let failNextLoad = true;
      jest.doMock('@kbn/react-query', () => {
        if (failNextLoad) {
          failNextLoad = false;
          throw loadError;
        }
        return jest.requireActual('@kbn/react-query');
      });
      const { getSharedInvestigationsQueryClient: getClient } = await import(
        './shared_query_client'
      );

      await expect(getClient()).rejects.toBe(loadError);
      const client = await getClient();
      expect(await getClient()).toBe(client);
    });
  });
});
