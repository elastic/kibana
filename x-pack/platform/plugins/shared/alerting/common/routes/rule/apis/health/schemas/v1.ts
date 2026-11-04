/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  MAX_KQL_FILTER_LENGTH,
  MAX_ID_LENGTH,
  MAX_FIELD_NAME_LENGTH,
  MAX_NAME_LENGTH,
  MAX_SAVED_OBJECT_TYPE_LENGTH,
  MAX_ARRAY_FIELDS,
} from '../../../../../constants';

export const ruleHealthRequestBodySchema = schema.object(
  {
    search: schema.maybe(schema.string({ maxLength: MAX_KQL_FILTER_LENGTH })),
    default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
      defaultValue: 'OR',
    }),
    search_fields: schema.maybe(
      schema.arrayOf(schema.string({ maxLength: MAX_FIELD_NAME_LENGTH }), {
        maxSize: MAX_ARRAY_FIELDS,
      })
    ),
    has_reference: schema.maybe(
      schema.nullable(
        schema.object({
          type: schema.string({ maxLength: MAX_SAVED_OBJECT_TYPE_LENGTH }),
          id: schema.string({ maxLength: MAX_ID_LENGTH }),
        })
      )
    ),
    filter: schema.maybe(schema.string({ maxLength: MAX_KQL_FILTER_LENGTH })),
    rule_type_ids: schema.maybe(
      schema.arrayOf(schema.string({ maxLength: MAX_ID_LENGTH }), { maxSize: MAX_ARRAY_FIELDS })
    ),
    consumers: schema.maybe(
      schema.arrayOf(schema.string({ maxLength: MAX_NAME_LENGTH }), {
        maxSize: MAX_ARRAY_FIELDS,
      })
    ),
  },
  { meta: { id: 'rule_health_request' } }
);

const reasonCountSchema = schema.object({
  reason: schema.string(),
  count: schema.number(),
});

export const ruleHealthResponseBodySchema = schema.object(
  {
    total: schema.number(),
    by_outcome: schema.recordOf(schema.string(), schema.number()),
    by_status: schema.recordOf(schema.string(), schema.number()),
    by_error_reason: schema.arrayOf(reasonCountSchema),
    by_warning_reason: schema.arrayOf(reasonCountSchema),
    top_error_messages: schema.arrayOf(
      schema.object({
        reason: schema.string(),
        message: schema.string(),
        count: schema.number(),
      })
    ),
    api_key_error: schema.object({
      count: schema.number(),
      messages: schema.arrayOf(schema.string()),
    }),
    missing_api_key: schema.object({
      count: schema.number(),
    }),
  },
  { meta: { id: 'rule_health_response' } }
);
