/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const findRulesRequestQuerySchema = schema.object({
  per_page: schema.number({
    defaultValue: 10,
    min: 0,
    meta: {
      description: 'The number of rules to return per page.',
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
  default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
    meta: {
      description: 'The default operator to use for the simple_query_string.',
    },
  }),
  search_fields: schema.maybe(
    schema.oneOf([schema.arrayOf(schema.string()), schema.string()], {
      meta: {
        description: 'The fields to perform the simple_query_string parsed query against.',
      },
    })
  ),
  sort_field: schema.maybe(
    schema.string({
      meta: {
        description:
          'Determines which field is used to sort the results. The field must exist in the `attributes` key of the response.',
      },
    })
  ),
  sort_order: schema.maybe(
    schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
      meta: {
        description: 'Determines the sort order.',
      },
    })
  ),
  has_reference: schema.maybe(
    // use nullable as maybe is currently broken
    // in config-schema
    schema.nullable(
      schema.object(
        {
          type: schema.string(),
          id: schema.string(),
        },
        {
          meta: {
            description:
              'Filters the rules that have a relation with the reference objects with a specific type and identifier.',
          },
        }
      )
    )
  ),
  fields: schema.maybe(
    schema.arrayOf(
      schema.string({
        meta: {
          description: 'The fields to return in the `attributes` key of the response.',
        },
      })
    )
  ),
  filter: schema.maybe(
    schema.string({
      meta: {
        description:
          'A KQL string that you filter with an attribute from your saved object. It should look like `savedObjectType.attributes.title: "myTitle"`. However, if you used a direct attribute of a saved object, such as `updatedAt`, you must define your filter, for example, `savedObjectType.updatedAt > 2018-12-22`.',
      },
    })
  ),
  filter_consumers: schema.maybe(
    schema.arrayOf(
      schema.string({
        meta: {
          description: 'List of consumers to filter.',
        },
      })
    )
  ),
});

export const findRulesInternalRequestBodySchema = schema.object({
  per_page: schema.number({
    defaultValue: 10,
    min: 0,
  }),
  page: schema.number({
    defaultValue: 1,
    min: 1,
  }),
  search: schema.maybe(schema.string()),
  default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  }),
  search_fields: schema.maybe(schema.oneOf([schema.arrayOf(schema.string()), schema.string()])),
  sort_field: schema.maybe(schema.string()),
  sort_order: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
  has_reference: schema.maybe(
    // use nullable as maybe is currently broken
    // in config-schema
    schema.nullable(
      schema.object({
        type: schema.string(),
        id: schema.string(),
      })
    )
  ),
  fields: schema.maybe(schema.arrayOf(schema.string())),
  filter: schema.maybe(schema.string()),
  rule_type_ids: schema.maybe(schema.arrayOf(schema.string())),
  consumers: schema.maybe(schema.arrayOf(schema.string())),
});
