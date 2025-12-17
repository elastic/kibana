/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { stringOrStringArraySchema } from '../../../../../schemas';

export const findRuleTemplatesRequestQuerySchema = schema.object({
  per_page: schema.number({
    defaultValue: 10,
    min: 0,
    max: 100,
    meta: {
      description: 'The number of rule templates to return per page.',
    },
  }),
  page: schema.number({
    defaultValue: 1,
    min: 1,
    meta: {
      description: 'The page number to return.',
    },
  }),
  search: schema.maybe(
    schema.string({
      meta: {
        description:
          'An Elasticsearch simple_query_string query that filters the objects in the response.',
      },
    })
  ),
  default_search_operator: schema.maybe(
    schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
      defaultValue: 'OR',
      meta: {
        description: 'The default operator to use for the simple_query_string.',
      },
    })
  ),
  sort_field: schema.maybe(
    schema.oneOf([schema.literal('name'), schema.literal('tags')], {
      defaultValue: 'name',
      meta: {
        description: 'Determines which field is used to sort the results.',
      },
    })
  ),
  sort_order: schema.maybe(
    schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
      defaultValue: 'asc',
      meta: {
        description: 'Determines the sort order.',
      },
    })
  ),
  rule_type_id: schema.maybe(
    schema.string({
      meta: {
        description: 'Filters the rule templates by rule type identifier.',
      },
    })
  ),
  tags: schema.maybe(
    stringOrStringArraySchema({
      meta: { description: 'Filters the rule templates by tags.' },
    })
  ),
});
