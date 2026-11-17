/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SAMPLE_SIZE } from '../common/constants';
import { vectorProjectionEmbeddableSchema } from './schema';

describe('vectorProjectionEmbeddableSchema', () => {
  it('applies defaults to a minimal state', () => {
    expect(
      vectorProjectionEmbeddableSchema.parse({ data_view_id: 'dv', vector_field: 'embedding' })
    ).toEqual({
      data_view_id: 'dv',
      vector_field: 'embedding',
      sample_size: 2000,
      dimensions: 2,
      n_neighbors: 15,
      min_dist: 0.1,
      cluster_detail: 'medium',
      point_size: 3,
      fog_strength: 0.7,
      background: 'dark',
      auto_rotate: true,
      show_labels: true,
    });
  });

  it('accepts only light and dark backgrounds', () => {
    const base = { data_view_id: 'dv', vector_field: 'embedding' };
    expect(
      vectorProjectionEmbeddableSchema.safeParse({ ...base, background: 'light' }).success
    ).toBe(true);
    expect(
      vectorProjectionEmbeddableSchema.safeParse({ ...base, background: '#1E293B' }).success
    ).toBe(false);
  });

  it('rejects unknown cluster detail levels and out-of-range display settings', () => {
    const base = { data_view_id: 'dv', vector_field: 'embedding' };
    expect(
      vectorProjectionEmbeddableSchema.safeParse({ ...base, cluster_detail: 'extreme' }).success
    ).toBe(false);
    expect(vectorProjectionEmbeddableSchema.safeParse({ ...base, point_size: 20 }).success).toBe(
      false
    );
    expect(vectorProjectionEmbeddableSchema.safeParse({ ...base, fog_strength: 1.5 }).success).toBe(
      false
    );
  });

  it('rejects sample sizes above the limit', () => {
    expect(
      vectorProjectionEmbeddableSchema.safeParse({
        data_view_id: 'dv',
        vector_field: 'embedding',
        sample_size: MAX_SAMPLE_SIZE + 1,
      }).success
    ).toBe(false);
  });

  it('rejects unsupported dimensions and unknown keys', () => {
    expect(
      vectorProjectionEmbeddableSchema.safeParse({
        data_view_id: 'dv',
        vector_field: 'embedding',
        dimensions: 4,
      }).success
    ).toBe(false);
    expect(
      vectorProjectionEmbeddableSchema.safeParse({
        data_view_id: 'dv',
        vector_field: 'embedding',
        unexpected: true,
      }).success
    ).toBe(false);
  });
});
