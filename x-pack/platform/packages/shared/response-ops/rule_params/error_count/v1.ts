/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { searchConfigurationSchema } from '../common/search_configuration_schema';

export const errorCountParamsSchema = schema.object({
  windowSize: schema.number({
    meta: {
      description:
        'The time frame in which the errors must occur (in `windowUnit` units). Generally it should be a value higher than the rule check interval to avoid gaps in detection.',
    },
  }),
  windowUnit: schema.string({
    meta: { description: 'The type of units for the time window: minutes, hours, or days.' },
  }),
  threshold: schema.number({
    meta: { description: 'The number of errors, which is the threshold for alerts.' },
  }),
  serviceName: schema.maybe(
    schema.string({
      meta: {
        description:
          'Filter the errors coming from your application to apply the rule to a specific service.',
      },
    })
  ),
  environment: schema.string({
    meta: {
      description:
        'Filter the errors coming from your application to apply the rule to a specific environment.',
    },
  }),
  groupBy: schema.maybe(
    schema.arrayOf(
      schema.string({
        meta: {
          description:
            'Perform a composite aggregation against the selected fields. When any of these groups match the selected rule conditions, an alert is triggered per group.',
        },
      })
    )
  ),
  errorGroupingKey: schema.maybe(
    schema.string({
      meta: {
        description:
          'Filter the errors coming from your application to apply the rule to a specific error grouping key, which is a hash of the stack trace and other properties.',
      },
    })
  ),
  useKqlFilter: schema.maybe(
    schema.boolean({
      meta: {
        description: 'A filter in Kibana Query Language (KQL) that limits the scope of the rule.',
      },
    })
  ),
  searchConfiguration: schema.maybe(searchConfigurationSchema),
});

export type ErrorCountRuleParams = TypeOf<typeof errorCountParamsSchema>;
