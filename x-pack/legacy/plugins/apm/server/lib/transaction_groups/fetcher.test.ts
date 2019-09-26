/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { transactionGroupsFetcher } from './fetcher';

function getSetup() {
  return {
    start: 1528113600000,
    end: 1528977600000,
    client: {
      search: jest.fn()
    } as any,
    config: {
      get: jest.fn<any, string[]>((key: string) => {
        switch (key) {
          case 'apm_oss.transactionIndices':
            return 'myIndex';
          case 'xpack.apm.ui.transactionGroupBucketSize':
            return 100;
        }
      }),
      has: () => true
    },
    uiFiltersES: [{ term: { 'service.environment': 'test' } }]
  };
}

describe('transactionGroupsFetcher', () => {
  describe('type: top_traces', () => {
    it('should call client.search with correct query', async () => {
      const setup = getSetup();
      await transactionGroupsFetcher({ type: 'top_traces' }, setup);
      expect(setup.client.search.mock.calls).toMatchSnapshot();
    });
  });

  describe('type: top_transactions', () => {
    it('should call client.search with correct query', async () => {
      const setup = getSetup();
      await transactionGroupsFetcher(
        {
          type: 'top_transactions',
          serviceName: 'opbeans-node',
          transactionType: 'request'
        },
        setup
      );
      expect(setup.client.search.mock.calls).toMatchSnapshot();
    });
  });
});
