/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { dropLatestBucket } from '../drop_latest_bucket';

describe('dropLatestBucket', () => {
  it('drops the last of a list with greater length than 1', () => {
    const testData = [{ prop: 'val' }, { prop: 'val' }];
    const result = dropLatestBucket(testData);
    expect(result).toMatchSnapshot();
  });
  it('returns an empty list when length === 1', () => {
    const testData = [{ prop: 'val' }];
    const result = dropLatestBucket(testData);
    expect(result).toEqual([]);
  });
  it('returns an empty list when length === 0', () => {
    const testData: any[] = [];
    const result = dropLatestBucket(testData);
    expect(result).toEqual([]);
  });
});
