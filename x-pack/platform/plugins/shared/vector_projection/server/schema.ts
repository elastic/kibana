/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import {
  BACKGROUND_OPTIONS,
  CLUSTER_DETAIL_LEVELS,
  DEFAULT_AUTO_ROTATE,
  DEFAULT_BACKGROUND,
  DEFAULT_CLUSTER_DETAIL,
  DEFAULT_FOG_STRENGTH,
  DEFAULT_MIN_DIST,
  DEFAULT_N_NEIGHBORS,
  DEFAULT_POINT_SIZE,
  DEFAULT_SHOW_LABELS,
  DEFAULT_SAMPLE_SIZE,
  MAX_POINT_SIZE,
  MAX_SAMPLE_SIZE,
  MIN_POINT_SIZE,
} from '../common/constants';

export const vectorProjectionEmbeddableSchema = lazySchema(() =>
  z
    .object({
      ...serializedTitlesSchema.shape,
      ...serializedTimeRangeSchema.shape,
      data_view_id: z
        .string()
        .min(1)
        .max(1000)
        .meta({ description: 'Data view ID (stored as a panel reference).' }),
      vector_field: z
        .string()
        .min(1)
        .max(1000)
        .meta({ description: 'Name of the dense_vector field to project.' }),
      label_field: z.string().min(1).max(1000).optional().meta({
        description:
          'Field used to color points. When omitted, points are colored by automatic clustering.',
      }),
      sample_size: z
        .number()
        .int()
        .min(10)
        .max(MAX_SAMPLE_SIZE)
        .default(DEFAULT_SAMPLE_SIZE)
        .meta({ description: 'Number of documents randomly sampled for the projection.' }),
      dimensions: z
        .union([z.literal(2), z.literal(3)])
        .default(2)
        .meta({ description: 'Render the projection in 2D or 3D.' }),
      n_neighbors: z.number().int().min(2).max(200).default(DEFAULT_N_NEIGHBORS).meta({
        description: 'UMAP neighborhood size. Larger values preserve more global structure.',
      }),
      min_dist: z
        .number()
        .min(0)
        .max(1)
        .default(DEFAULT_MIN_DIST)
        .meta({ description: 'UMAP minimum distance between embedded points.' }),
      cluster_detail: z.enum(CLUSTER_DETAIL_LEVELS).default(DEFAULT_CLUSTER_DETAIL).meta({
        description:
          'How finely automatic clustering splits the projection. Ignored when label_field is set.',
      }),
      point_size: z
        .number()
        .min(MIN_POINT_SIZE)
        .max(MAX_POINT_SIZE)
        .default(DEFAULT_POINT_SIZE)
        .meta({ description: 'Point radius in pixels.' }),
      fog_strength: z
        .number()
        .min(0)
        .max(1)
        .default(DEFAULT_FOG_STRENGTH)
        .meta({ description: 'Depth fog applied to distant points in 3D projections.' }),
      background: z.enum(BACKGROUND_OPTIONS).default(DEFAULT_BACKGROUND).meta({
        description: 'Plot background: light follows the theme, dark uses a fixed slate color.',
      }),
      auto_rotate: z
        .boolean()
        .default(DEFAULT_AUTO_ROTATE)
        .meta({ description: 'Slowly rotate 3D projections.' }),
      show_labels: z
        .boolean()
        .default(DEFAULT_SHOW_LABELS)
        .meta({ description: 'Show category or cluster names at the center of each group.' }),
    })
    .strict()
    .meta({
      id: 'vector_projection_embeddable',
      description: 'UMAP projection of a dense_vector field',
    })
);

export type VectorProjectionEmbeddableState = z.output<typeof vectorProjectionEmbeddableSchema>;
