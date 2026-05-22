/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf, schema } from '@kbn/config-schema';

export const GetCollectorGroupsRequestSchema = {
  query: schema.object({
    groupBy: schema.oneOf([schema.literal('collector.group'), schema.literal('config.name')], {
      defaultValue: 'collector.group' as const,
      meta: { description: 'Field to group collectors by' },
    }),
    kuery: schema.maybe(
      schema.string({
        meta: { description: 'A KQL query string to filter collectors before grouping' },
      })
    ),
    perPage: schema.number({
      defaultValue: 20,
      meta: { description: 'Number of groups per page' },
    }),
    afterKey: schema.maybe(
      schema.string({
        meta: {
          description:
            'JSON-stringified composite aggregation after_key for cursor-based pagination',
        },
      })
    ),
  }),
};

export const CollectorGroupSchema = schema.object({
  group: schema.string({
    meta: { description: 'Group key value' },
  }),
  groupDisplayName: schema.string({
    meta: { description: 'Human-readable display name for the group' },
  }),
  docCount: schema.number({
    meta: { description: 'Number of collectors in this group' },
  }),
  signals: schema.arrayOf(schema.string(), {
    meta: { description: 'Signal types present in this group (e.g. logs, metrics, traces)' },
  }),
});

export const GetCollectorGroupsResponseSchema = schema.object({
  items: schema.arrayOf(CollectorGroupSchema),
  afterKey: schema.maybe(schema.string()),
});

export type CollectorGroup = TypeOf<typeof CollectorGroupSchema>;
export type GetCollectorGroupsResponse = TypeOf<typeof GetCollectorGroupsResponseSchema>;
