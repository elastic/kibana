/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';

export const logRateAnalysisEmbeddableStateSchema = z
  .object({
    ...serializedTitlesSchema.shape,
    ...serializedTimeRangeSchema.shape,
    data_view_id: z.string().min(1).max(1000).meta({
      description: 'The data view ID used to run log rate analysis.',
    }),
  })
  .strict()
  .meta({
    id: 'aiops_log_rate_analysis',
    description: 'Log rate analysis embeddable schema',
  });

export type LogRateAnalysisEmbeddableState = z.output<typeof logRateAnalysisEmbeddableStateSchema>;
