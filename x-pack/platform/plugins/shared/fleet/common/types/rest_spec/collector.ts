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
        maxLength: 4096,
        meta: { description: 'A KQL query string to filter collectors before grouping' },
      })
    ),
    perPage: schema.number({
      defaultValue: 20,
      min: 1,
      max: 1000,
      meta: { description: 'Number of groups per page' },
    }),
    afterKey: schema.maybe(
      schema.string({
        maxLength: 2048,
        meta: {
          description:
            'After key is used for cursor-based pagination, use it to get the next page of results',
        },
      })
    ),
    showInactive: schema.boolean({
      defaultValue: false,
      meta: { description: 'When true, include inactive collectors in the results' },
    }),
  }),
};

export const CollectorGroupSchema = schema.object({
  group: schema.string({
    maxLength: 1024,
    meta: { description: 'Group key value' },
  }),
  groupDisplayName: schema.string({
    maxLength: 1024,
    meta: { description: 'Human-readable display name for the group' },
  }),
  docCount: schema.number({
    meta: { description: 'Number of collectors in this group' },
  }),
  signals: schema.arrayOf(schema.string({ maxLength: 64 }), {
    maxSize: 10,
    meta: {
      description: 'Signal types present in this group (for example, logs, metrics, traces)',
    },
  }),
  isUngrouped: schema.maybe(
    schema.boolean({
      meta: {
        description: 'True when the collectors in this bucket have no value for the group-by field',
      },
    })
  ),
});

export const GetCollectorGroupsResponseSchema = schema.object({
  items: schema.arrayOf(CollectorGroupSchema, { maxSize: 1000 }),
  afterKey: schema.maybe(schema.string({ maxLength: 2048 })),
});

export type CollectorGroup = TypeOf<typeof CollectorGroupSchema>;
export type GetCollectorGroupsResponse = TypeOf<typeof GetCollectorGroupsResponseSchema>;
