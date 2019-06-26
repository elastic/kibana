/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatEsBucketsForHistogram } from '../format_es_buckets_for_histogram';

describe('formatEsBucketsForHistogram', () => {
  it('returns the provided buckets if length is below min threshold', () => {
    const buckets = [{ key: 1000 }];
    const result = formatEsBucketsForHistogram(buckets);
    expect(result).toMatchSnapshot();
  });
  it('returns properly formatted buckets', () => {
    const buckets = [{ key: 1000 }, { key: 2000 }, { key: 3000 }, { key: 4000 }];
    const result = formatEsBucketsForHistogram(buckets);
    expect(result).toMatchSnapshot();
  });
  it('returns properly formatted object for generic call', () => {
    const buckets = [
      { key: 1000, name: 'something', value: 150 },
      { key: 2000, name: 'something', value: 120 },
      { key: 3000, name: 'something', value: 180 },
    ];
    const result = formatEsBucketsForHistogram(buckets);
    expect(result).toMatchSnapshot();
  });
});
