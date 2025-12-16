/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { validateDurationV1, validateRuleId } from '../../../../rule/validation';

export const updateESQLRuleParamsSchema = schema.object({
  id: schema.string({
    validate: validateRuleId,
  }),
});

export const updateESQLBodySchema = schema.object({
  name: schema.string({
    meta: {
      description:
        'The name of the rule. While this name does not have to be unique, a distinctive name can help you identify a rule.',
    },
  }),
  enabled: schema.boolean({
    defaultValue: true,
    meta: {
      description:
        'Indicates whether you want to run the rule on an interval basis after it is created.',
    },
  }),
  tags: schema.arrayOf(schema.string(), {
    defaultValue: [],
    meta: { description: 'The tags for the rule.' },
  }),
  groupKey: schema.arrayOf(schema.string(), {
    meta: { description: 'Fields to group alerts by.' },
  }),
  track: schema.maybe(
    schema.object({
      recovery: schema.maybe(
        schema.object({
          enabled: schema.maybe(schema.boolean()),
          schedule: schema.maybe(schema.string({ validate: validateDurationV1 })),
          lookbackWindow: schema.maybe(schema.string({ validate: validateDurationV1 })),
          recoveryQuery: schema.maybe(schema.string()),
        })
      ),
    })
  ),
  esql: schema.string({
    meta: {
      description: 'The ESQL query to execute for the rule.',
    },
  }),
  lookbackWindow: schema.string({
    validate: validateDurationV1,
    meta: {
      description: 'The lookback time window for the query, e.g., "5m".',
    },
  }),
  timeField: schema.string({
    meta: {
      description: 'The primary timestamp field for the query.',
    },
  }),
  parentId: schema.maybe(
    schema.string({
      meta: {
        description: 'The parent ID for the rule, used for tracking recovery rules.',
      },
    })
  ),
  schedule: schema.string({
    validate: validateDurationV1,
    meta: {
      description:
        'The check interval, which specifies how frequently the rule conditions are checked, specified in seconds, minutes, hours, or days.',
    },
  }),
});
