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
import {
  DEFAULT_MINIMUM_TIME_RANGE,
  MINIMUM_TIME_RANGE_OPTION,
} from '@kbn/aiops-log-pattern-analysis/constants';
import {
  MAX_SAMPLER_PROBABILITY,
  MIN_SAMPLER_PROBABILITY,
  RANDOM_SAMPLER_OPTION,
} from '@kbn/ml-random-sampler-utils';

export const patternAnalysisEmbeddableStateSchema = schema.object(
  {
    ...serializedTitlesSchema.getPropSchemas(),
    ...serializedTimeRangeSchema.getPropSchemas(),
    data_view_id: schema.string({
      minLength: 1,
      maxLength: 1000,
      meta: { description: 'The data view ID used for pattern analysis.' },
    }),
    field_name: schema.string({
      minLength: 1,
      maxLength: 1000,
      meta: { description: 'The text field on which to run pattern analysis.' },
    }),
    minimum_time_range: schema.oneOf(
      [
        schema.literal(MINIMUM_TIME_RANGE_OPTION.NO_MINIMUM),
        schema.literal(MINIMUM_TIME_RANGE_OPTION.ONE_WEEK),
        schema.literal(MINIMUM_TIME_RANGE_OPTION.ONE_MONTH),
        schema.literal(MINIMUM_TIME_RANGE_OPTION.THREE_MONTHS),
        schema.literal(MINIMUM_TIME_RANGE_OPTION.SIX_MONTHS),
      ],
      {
        defaultValue: DEFAULT_MINIMUM_TIME_RANGE,
        meta: { description: 'Minimum time range for pattern analysis.' },
      }
    ),
    random_sampler_mode: schema.oneOf(
      [
        schema.literal(RANDOM_SAMPLER_OPTION.ON_AUTOMATIC),
        schema.literal(RANDOM_SAMPLER_OPTION.ON_MANUAL),
        schema.literal(RANDOM_SAMPLER_OPTION.OFF),
      ],
      {
        defaultValue: RANDOM_SAMPLER_OPTION.ON_AUTOMATIC,
        meta: { description: 'The random sampler mode.' },
      }
    ),
    random_sampler_probability: schema.nullable(
      schema.number({
        min: MIN_SAMPLER_PROBABILITY,
        max: MAX_SAMPLER_PROBABILITY,
        meta: {
          description: 'The probability to use for random sampling (between 0.00001 and 0.5).',
        },
      })
    ),
  },
  {
    validate: (value) => {
      if (
        value.random_sampler_mode === RANDOM_SAMPLER_OPTION.ON_MANUAL &&
        value.random_sampler_probability === null
      ) {
        return '`random_sampler_probability` must be set when `random_sampler_mode` is `on_manual`';
      }
    },
    meta: {
      id: 'aiops_pattern_analysis',
      description: 'Log Pattern Analysis embeddable schema',
    },
  }
);

export type PatternAnalysisEmbeddableState = TypeOf<typeof patternAnalysisEmbeddableStateSchema>;
