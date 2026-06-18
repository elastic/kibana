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
import {
  DEFAULT_MINIMUM_TIME_RANGE,
  MINIMUM_TIME_RANGE_OPTION,
} from '@kbn/aiops-log-pattern-analysis/constants';
import {
  MAX_SAMPLER_PROBABILITY,
  MIN_SAMPLER_PROBABILITY,
  RANDOM_SAMPLER_OPTION,
} from '@kbn/ml-random-sampler-utils';

export const patternAnalysisEmbeddableStateSchema = z
  .object({
    ...serializedTitlesSchema.shape,
    ...serializedTimeRangeSchema.shape,
    data_view_id: z.string().min(1).max(1000).meta({
      description: 'The data view ID used for pattern analysis.',
    }),
    field_name: z.string().min(1).max(1000).meta({
      description: 'The text field on which to run pattern analysis.',
    }),
    minimum_time_range: z
      .union([
        z.literal(MINIMUM_TIME_RANGE_OPTION.NO_MINIMUM),
        z.literal(MINIMUM_TIME_RANGE_OPTION.ONE_WEEK),
        z.literal(MINIMUM_TIME_RANGE_OPTION.ONE_MONTH),
        z.literal(MINIMUM_TIME_RANGE_OPTION.THREE_MONTHS),
        z.literal(MINIMUM_TIME_RANGE_OPTION.SIX_MONTHS),
      ])
      .default(DEFAULT_MINIMUM_TIME_RANGE)
      .meta({ description: 'Minimum time range for pattern analysis.' }),
    random_sampler_mode: z
      .union([
        z.literal(RANDOM_SAMPLER_OPTION.ON_AUTOMATIC),
        z.literal(RANDOM_SAMPLER_OPTION.ON_MANUAL),
        z.literal(RANDOM_SAMPLER_OPTION.OFF),
      ])
      .default(RANDOM_SAMPLER_OPTION.ON_AUTOMATIC)
      .meta({ description: 'The random sampler mode.' }),
    random_sampler_probability: z
      .number()
      .min(MIN_SAMPLER_PROBABILITY)
      .max(MAX_SAMPLER_PROBABILITY)
      .nullable()
      .default(null)
      .meta({
        description: 'The probability to use for random sampling (between 0.00001 and 0.5).',
      }),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.random_sampler_mode === RANDOM_SAMPLER_OPTION.ON_MANUAL &&
      value.random_sampler_probability === null
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          '`random_sampler_probability` must be set when `random_sampler_mode` is `on_manual`',
      });
    }
  })
  .meta({
    id: 'aiops_pattern_analysis',
    description: 'Log Pattern Analysis embeddable schema',
  });

export type PatternAnalysisEmbeddableState = z.output<typeof patternAnalysisEmbeddableStateSchema>;
