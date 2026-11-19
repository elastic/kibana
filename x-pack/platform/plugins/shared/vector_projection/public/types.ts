/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VectorProjectionEmbeddableState } from '../server';

export type VectorProjectionConfig = Pick<
  VectorProjectionEmbeddableState,
  | 'data_view_id'
  | 'vector_field'
  | 'label_field'
  | 'sample_size'
  | 'dimensions'
  | 'n_neighbors'
  | 'min_dist'
  | 'cluster_detail'
  | 'point_size'
  | 'fog_strength'
  | 'background'
  | 'auto_rotate'
  | 'show_labels'
>;
