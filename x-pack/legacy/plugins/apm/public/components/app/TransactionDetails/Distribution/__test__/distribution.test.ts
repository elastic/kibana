/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFormattedBuckets } from '../index';
import { IBucket } from '../../../../../../server/lib/transactions/distribution/get_buckets/transform';

describe('Distribution', () => {
  it('getFormattedBuckets', () => {
    const buckets = [
      { key: 0, count: 0, samples: [] },
      { key: 20, count: 0, samples: [] },
      { key: 40, count: 0, samples: [] },
      {
        key: 60,
        count: 5,
        samples: [
          {
            transactionId: 'someTransactionId'
          }
        ]
      },
      {
        key: 80,
        count: 100,
        samples: [
          {
            transactionId: 'anotherTransactionId'
          }
        ]
      }
    ] as IBucket[];
    expect(getFormattedBuckets(buckets, 20)).toEqual([
      { x: 20, x0: 0, y: 0, style: { cursor: 'default' }, samples: [] },
      { x: 40, x0: 20, y: 0, style: { cursor: 'default' }, samples: [] },
      { x: 60, x0: 40, y: 0, style: { cursor: 'default' }, samples: [] },
      {
        x: 80,
        x0: 60,
        y: 5,
        style: { cursor: 'pointer' },
        samples: [
          {
            transactionId: 'someTransactionId'
          }
        ]
      },
      {
        x: 100,
        x0: 80,
        y: 100,
        style: { cursor: 'pointer' },
        samples: [
          {
            transactionId: 'anotherTransactionId'
          }
        ]
      }
    ]);
  });
});
