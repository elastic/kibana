/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { DATASET_UUID_NAMESPACE } from '../constants';
import { getDatasetId } from './dataset_ids';
import { DEFAULT_SPACE_ID } from './spaces';

describe('getDatasetId', () => {
  // Ids are stored, and both the server and the offline client derive them, so
  // a change here detaches existing datasets from their examples and scores.
  it('keeps the derivation the default space had before space-awareness', () => {
    expect(getDatasetId(DEFAULT_SPACE_ID, 'dataset-1')).toBe(
      uuidv5('dataset-1', DATASET_UUID_NAMESPACE)
    );
  });

  it('keeps the derivation the other spaces are stored under', () => {
    expect(getDatasetId('marketing', 'dataset-1')).toBe(
      uuidv5(JSON.stringify(['marketing', 'dataset-1']), DATASET_UUID_NAMESPACE)
    );
  });

  it('gives one name a different id in every space', () => {
    const ids = [DEFAULT_SPACE_ID, 'marketing', 'sales'].map((spaceId) =>
      getDatasetId(spaceId, 'shared-name')
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('separates the space from the name, so neither can pose as the other', () => {
    // A delimiter would let `a::b`/`c` and `a`/`b::c` land on one id.
    expect(getDatasetId('marketing', 'a-dataset')).not.toBe(getDatasetId('marketing-a', 'dataset'));
  });

  it('derives a distinct id for each later generation', () => {
    const ids = [0, 1, 2, 3].map((generation) =>
      getDatasetId('marketing', 'dataset-1', generation)
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('derives the same later generation for everyone who asks', () => {
    // Two creates racing for one name have to land on one id, so that
    // Elasticsearch refuses the second rather than storing a duplicate name.
    expect(getDatasetId('marketing', 'dataset-1', 1)).toBe(
      getDatasetId('marketing', 'dataset-1', 1)
    );
  });
});
