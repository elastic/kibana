/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';
import {
  AI_INSIGHTS_GENERATION_MODE,
  AI_INSIGHTS_HEIGHT_MODE,
  AI_INSIGHTS_REFRESH_MODE,
} from '../../common/ai_insights/constants';

export const aiInsightsEmbeddableSchema = z.object({
  connector_id: z
    .string()
    .max(256)
    .default('')
    .meta({ description: 'Id of the GenAI connector used to generate insights.' }),
  // Optional so previously saved panels (connector_id only) keep validating.
  // Defaults are applied in the embeddable factory, not via zod .default().
  generation_mode: z
    .enum([AI_INSIGHTS_GENERATION_MODE.automatic, AI_INSIGHTS_GENERATION_MODE.on_demand])
    .optional()
    .meta({
      description:
        'Whether insights generate automatically on load, or only when the user clicks Generate.',
    }),
  refresh_mode: z
    .enum([AI_INSIGHTS_REFRESH_MODE.auto, AI_INSIGHTS_REFRESH_MODE.manual])
    .optional()
    .meta({
      description:
        'Whether insights refresh when dashboard time range/filters change, or only on manual update.',
    }),
  height_mode: z
    .enum([AI_INSIGHTS_HEIGHT_MODE.auto, AI_INSIGHTS_HEIGHT_MODE.fixed])
    .optional()
    .meta({
      description:
        'Whether the panel grid hugs content height, or stays fixed with internal scroll.',
    }),
  is_collapsed: z
    .boolean()
    .optional()
    .meta({ description: 'When true, the panel shows only the compact status header.' }),
  expanded_grid_h: z
    .number()
    .int()
    .min(2)
    .max(200)
    .optional()
    .meta({
      description: 'Dashboard grid height to restore when expanding from a collapsed state.',
    }),
  ...serializedTitlesSchema.shape,
});

export type AiInsightsEmbeddableState = z.output<typeof aiInsightsEmbeddableSchema>;
