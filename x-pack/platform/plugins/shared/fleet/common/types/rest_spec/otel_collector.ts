/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const GetOtelCollectorsRequestSchema = {
  query: schema.object({
    page: schema.maybe(schema.number({ meta: { description: 'Page number' } })),
    perPage: schema.number({
      defaultValue: 20,
      meta: { description: 'Number of results per page' },
    }),
    kuery: schema.maybe(
      schema.string({
        meta: { description: 'A KQL query string to filter results' },
      })
    ),
    showInactive: schema.boolean({
      defaultValue: false,
      meta: { description: 'When true, include inactive collectors in the results' },
    }),
    sortField: schema.maybe(schema.string({ meta: { description: 'Field to sort results by' } })),
    sortOrder: schema.maybe(
      schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
        meta: { description: 'Sort order, ascending or descending' },
      })
    ),
  }),
};

export const OtelCollectorSchema = schema.object({
  id: schema.string(),
  status: schema.maybe(schema.string()),
  active: schema.boolean(),
  enrolled_at: schema.string(),
  unenrolled_at: schema.maybe(schema.string()),
  last_checkin: schema.maybe(schema.string()),
  last_checkin_status: schema.maybe(
    schema.oneOf([
      schema.literal('error'),
      schema.literal('online'),
      schema.literal('degraded'),
      schema.literal('updating'),
      schema.literal('starting'),
      schema.literal('disconnected'),
    ])
  ),
  last_checkin_message: schema.maybe(schema.string()),
  namespaces: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  identifying_attributes: schema.maybe(
    schema.recordOf(schema.string(), schema.oneOf([schema.string(), schema.number()]))
  ),
  non_identifying_attributes: schema.maybe(
    schema.recordOf(schema.string(), schema.oneOf([schema.string(), schema.number()]))
  ),
  tags: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  capabilities: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 100 })),
  health: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  signals: schema.maybe(schema.arrayOf(schema.string(), { maxSize: 10 })),
});

export type OtelCollector = TypeOf<typeof OtelCollectorSchema>;

export const GetOtelCollectorsResponseSchema = schema.object({
  items: schema.arrayOf(OtelCollectorSchema, { maxSize: 10000 }),
  total: schema.number(),
  page: schema.number(),
  perPage: schema.number(),
});
