/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VectorProjectionEmbeddableState } from '../server/schema';
import { VECTOR_PROJECTION_DATA_VIEW_REF_NAME } from './constants';
import { transformIn, transformOut } from './transforms';

const state: VectorProjectionEmbeddableState = {
  title: 'Embeddings',
  data_view_id: 'my-data-view',
  vector_field: 'text_embedding',
  label_field: 'category',
  sample_size: 2000,
  dimensions: 2,
  n_neighbors: 15,
  min_dist: 0.1,
  cluster_detail: 'medium',
  point_size: 3,
  fog_strength: 0.7,
  background: 'light',
  auto_rotate: true,
  show_labels: true,
};

describe('vector projection transforms', () => {
  it('extracts the data view id into a reference', () => {
    const { state: storedState, references } = transformIn(state);

    expect(storedState).not.toHaveProperty('data_view_id');
    expect(references).toEqual([
      { type: 'index-pattern', name: VECTOR_PROJECTION_DATA_VIEW_REF_NAME, id: 'my-data-view' },
    ]);
  });

  it('round-trips through transformIn and transformOut', () => {
    const { state: storedState, references } = transformIn(state);

    expect(transformOut(storedState, references)).toEqual(state);
  });

  it('injects the data view id from references', () => {
    const { state: storedState } = transformIn(state);

    expect(
      transformOut(storedState, [
        { type: 'index-pattern', name: VECTOR_PROJECTION_DATA_VIEW_REF_NAME, id: 'imported-id' },
      ]).data_view_id
    ).toBe('imported-id');
  });

  it('ignores references with other names', () => {
    const { state: storedState } = transformIn(state);

    expect(
      transformOut(storedState, [{ type: 'index-pattern', name: 'other', id: 'other-id' }])
        .data_view_id
    ).toBe('');
  });
});
