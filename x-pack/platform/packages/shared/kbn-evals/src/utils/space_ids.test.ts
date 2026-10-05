/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpaceIdsFromEnv } from './space_ids';

describe('getSpaceIdsFromEnv', () => {
  const withSpaceIds = <T>(value: string | undefined, read: () => T): T => {
    const previous = process.env.EVAL_SPACE_IDS;
    if (value === undefined) {
      delete process.env.EVAL_SPACE_IDS;
    } else {
      process.env.EVAL_SPACE_IDS = value;
    }

    try {
      return read();
    } finally {
      if (previous === undefined) {
        delete process.env.EVAL_SPACE_IDS;
      } else {
        process.env.EVAL_SPACE_IDS = previous;
      }
    }
  };

  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['only separators', ' , , '],
  ])('leaves the run in the default space when the variable is %s', (_, value) => {
    expect(withSpaceIds(value, getSpaceIdsFromEnv)).toBeUndefined();
  });

  it('reads a comma-separated list, keeping the order the run was given', () => {
    // The first space is where the run works, so the order decides the dataset
    // ids: reordering them would create a second copy of every dataset.
    expect(withSpaceIds('marketing, sales', getSpaceIdsFromEnv)).toEqual(['marketing', 'sales']);
  });

  it('refuses all spaces, which scores cannot be ingested into', () => {
    expect(() => withSpaceIds('*', getSpaceIdsFromEnv)).toThrow(/does not accept/);
    expect(() => withSpaceIds('marketing,*', getSpaceIdsFromEnv)).toThrow(/does not accept/);
  });
});
