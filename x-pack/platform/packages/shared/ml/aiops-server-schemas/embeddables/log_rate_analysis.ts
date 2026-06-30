/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, type TypeOf } from '@kbn/config-schema';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';

export const logRateAnalysisEmbeddableStateSchema = schema.object(
  {
    ...serializedTitlesSchema.getPropSchemas(),
    ...serializedTimeRangeSchema.getPropSchemas(),
    data_view_id: schema.string({
      minLength: 1,
      maxLength: 1000,
      meta: { description: 'The data view ID used to run log rate analysis.' },
    }),
  },
  {
    meta: {
      id: 'aiops_log_rate_analysis',
      description: 'Log rate analysis embeddable schema',
    },
  }
);

export type LogRateAnalysisEmbeddableState = TypeOf<typeof logRateAnalysisEmbeddableStateSchema>;
