/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import {
  MAX_APM_DOCUMENT_VALUE_LENGTH,
  MAX_APM_FIELD_VALUE_LENGTH,
  MAX_APM_GROUP_BY_FIELDS,
  MAX_TIME_WINDOW_UNIT_LENGTH,
} from '../common/constants';
import { searchConfigurationSchema } from '../common/search_configuration_schema';

export const transactionErrorRateParamsSchema = schema.object(
  {
    windowSize: schema.number(),
    windowUnit: schema.string({ maxLength: MAX_TIME_WINDOW_UNIT_LENGTH }),
    threshold: schema.number(),
    transactionType: schema.maybe(schema.string({ maxLength: MAX_APM_FIELD_VALUE_LENGTH })),
    transactionName: schema.maybe(schema.string({ maxLength: MAX_APM_DOCUMENT_VALUE_LENGTH })),
    serviceName: schema.maybe(schema.string({ maxLength: MAX_APM_FIELD_VALUE_LENGTH })),
    environment: schema.string({ maxLength: MAX_APM_FIELD_VALUE_LENGTH }),
    groupBy: schema.maybe(
      schema.arrayOf(schema.string({ maxLength: MAX_APM_FIELD_VALUE_LENGTH }), {
        maxSize: MAX_APM_GROUP_BY_FIELDS,
      })
    ),
    useKqlFilter: schema.maybe(schema.boolean()),
    searchConfiguration: schema.maybe(searchConfigurationSchema),
  },
  {
    meta: {
      title: 'Transaction Error Rate Rule Params',
      description:
        'The parameters for the transaction error rate rule. These parameters are appropriate when `rule_type_id` is `apm.transaction_error_rate`.',
    },
  }
);

export type TransactionErrorRateRuleParams = TypeOf<typeof transactionErrorRateParamsSchema>;
