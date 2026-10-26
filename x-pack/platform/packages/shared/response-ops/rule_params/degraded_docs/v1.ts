/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { COMPARATORS } from '@kbn/alerting-comparators';
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { oneOfLiterals } from '../common/utils';

const comparators = Object.values(COMPARATORS);

const searchConfigSchema = schema.object({
  index: schema.string({ maxLength: 10000 }),
});

export const degradedDocsParamsSchema = schema.object(
  {
    timeUnit: schema.string({ maxLength: 64 }),
    timeSize: schema.number(),
    threshold: schema.arrayOf(schema.number(), { maxSize: 2 }),
    comparator: oneOfLiterals(comparators),
    groupBy: schema.maybe(schema.arrayOf(schema.string({ maxLength: 1000 }), { maxSize: 100 })),
    searchConfiguration: searchConfigSchema,
  },
  {
    meta: {
      title: 'Degraded Docs Rule Params',
      description:
        'The parameters for the degraded docs rule. These parameters are appropriate when `rule_type_id` is `datasetQuality.degradedDocs`.',
    },
  }
);

export type DegradedDocsRuleParams = TypeOf<typeof degradedDocsParamsSchema>;
