/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

// const rawQuerySchema = schema.object(
//   {
//     query: schema.oneOf([schema.string(), schema.recordOf(schema.string(), schema.any())]),
//     language: schema.string(),
//   },
//   { unknowns: 'allow' }
// );
// const rawAggregateQuerySchema = schema.object(
//   {
//     esql: schema.string(),
//   },
//   { unknowns: 'allow' }
// );
// const rawFilterSchema = schema.object(
//   {
//     $state: schema.maybe(
//       schema.object({
//         store: schema.oneOf([schema.literal('appState'), schema.literal('globalState')]),
//       })
//     ),
//     meta: schema.object({
//       alias: schema.maybe(schema.nullable(schema.string())),
//       disabled: schema.maybe(schema.boolean()),
//       negate: schema.maybe(schema.boolean()),
//       controlledBy: schema.maybe(schema.string()),
//       group: schema.maybe(schema.string()),
//       index: schema.maybe(schema.string()),
//       isMultiIndex: schema.maybe(schema.boolean()),
//       type: schema.maybe(schema.string()),
//       key: schema.maybe(schema.string()),
//       params: schema.maybe(schema.any()), // using any here because of recursive typing
//       value: schema.maybe(schema.string()),
//       field: schema.maybe(schema.string()),
//     }),
//     query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
//   },
//   { unknowns: 'allow' }
// );

// const rawSortDirectionSchema = schema.oneOf([schema.literal('asc'), schema.literal('desc')]);
// const rawSortDirectionNumericSchema = schema.object({
//   order: rawSortDirectionSchema,
//   format: schema.maybe(schema.string()),
// });
// const rawSortDirectionFormatSchema = schema.object({
//   order: rawSortDirectionSchema,
//   numeric_type: schema.maybe(
//     schema.oneOf([
//       schema.literal('double'),
//       schema.literal('long'),
//       schema.literal('date'),
//       schema.literal('date_nanos'),
//     ])
//   ),
// });
// const rawSortSchema = schema.recordOf(
//   schema.string(),
//   schema.oneOf([
//     rawSortDirectionSchema,
//     rawSortDirectionNumericSchema,
//     rawSortDirectionFormatSchema,
//   ])
// );

const rawLayoutIdSchema = schema.oneOf([
  schema.literal('preserve_layout'),
  schema.literal('print'),
  schema.literal('canvas'),
]);

// // LayoutParams x-pack/platform/plugins/shared/screenshotting/common/layout.ts
// const rawLayoutParamsSchema = schema.object(
//   {
//     id: schema.maybe(rawLayoutIdSchema),
//     dimensions: schema.maybe(
//       schema.object({
//         width: schema.number(),
//         height: schema.number(),
//       })
//     ),
//     selectors: schema.maybe(
//       schema.object({
//         screenshot: schema.maybe(schema.string()),
//         renderComplete: schema.maybe(schema.string()),
//         renderError: schema.maybe(schema.string()),
//         renderErrorAttribute: schema.maybe(schema.string()),
//         itemsCountAttribute: schema.maybe(schema.string()),
//         timefilterDurationAttribute: schema.maybe(schema.string()),
//       })
//     ),
//     zoom: schema.maybe(schema.number()),
//   },
//   { unknowns: 'allow' }
// );

// // LocatorParams src/platform/packages/private/kbn-reporting/common/url.ts
// const rawLocatorParamsSchema = schema.object(
//   {
//     id: schema.string(),
//     version: schema.maybe(schema.string()),
//     params: schema.any(),
//   },
//   { unknowns: 'allow' }
// );

// const rawBasePayload = schema.object({
//   // BaseParams src/platform/packages/private/kbn-reporting/common/types.ts
//   browserTimezone: schema.string(),
//   objectType: schema.string(),
//   title: schema.string(),
//   version: schema.string(),
//   layout: schema.maybe(rawLayoutParamsSchema),
//   pagingStrategy: schema.maybe(schema.oneOf([schema.literal('pit'), schema.literal('scroll')])),
//   spaceId: schema.maybe(schema.string()),
// });

// const rawPdfPayload = rawBasePayload.extends(
//   {
//     layout: rawLayoutParamsSchema,
//     locatorParams: schema.arrayOf(rawLocatorParamsSchema, { defaultValue: [] }),
//   },
//   { unknowns: 'allow' }
// );

// const rawPngPayload = rawBasePayload.extends(
//   {
//     layout: rawLayoutParamsSchema,
//     locatorParams: rawLocatorParamsSchema,
//   },
//   { unknowns: 'allow' }
// );

// const rawSearchSourcePayload = rawBasePayload.extends({
//   columns: schema.maybe(schema.arrayOf(schema.string())),
//   // // src/platform/plugins/shared/data/common/search/search_source/types.ts
//   searchSource: schema.maybe(
//     schema.object(
//       {
//         type: schema.maybe(schema.string()),
//         query: schema.maybe(schema.oneOf([rawQuerySchema, rawAggregateQuerySchema])),
//         filter: schema.maybe(schema.arrayOf(rawFilterSchema)),
//         sort: schema.maybe(schema.arrayOf(rawSortSchema)),
//         highlight: schema.maybe(schema.any()),
//         highlightAll: schema.maybe(schema.boolean()),
//         trackTotalHits: schema.maybe(schema.oneOf([schema.boolean(), schema.number()])),
//         aggs: schema.maybe(schema.any()), // using any here because of function typing
//         from: schema.maybe(schema.number()),
//         size: schema.maybe(schema.number()),
//         source: schema.maybe(schema.oneOf([schema.boolean(), schema.arrayOf(schema.any())])), // using any here because of recursive typing
//         version: schema.maybe(schema.boolean()),
//         fields: schema.maybe(schema.arrayOf(schema.any())), // using any here because of serializable
//         fieldsFromSource: schema.maybe(schema.any()),
//         index: schema.maybe(schema.any()), // using any here because of data view class
//         timeout: schema.maybe(schema.string()),
//         terminate_after: schema.maybe(schema.number()),
//         searchAfter: schema.maybe(schema.any()),
//         pit: schema.maybe(schema.any()),
//         parent: schema.maybe(schema.any()),
//       },
//       { unknowns: 'allow' }
//     )
//   ),
// });

export const rawScheduleSchema = schema.object({
  rrule: schema.object({
    freq: schema.number(),
    interval: schema.number(),
    tzid: schema.maybe(schema.string({ defaultValue: 'UTC' })),
  }),
});

export const rawNotificationSchema = schema.object({
  email: schema.maybe(
    schema.object({
      to: schema.arrayOf(schema.string()),
    })
  ),
});

export const rawScheduledReportSchema = schema.object({
  jobType: schema.string(),
  createdAt: schema.string(),
  createdBy: schema.oneOf([schema.string(), schema.boolean()]),
  migrationVersion: schema.string(),
  payload: schema.string(),
  title: schema.string(),
  // payload: schema.oneOf([rawSearchSourcePayload, rawPdfPayload, rawPngPayload]),
  meta: schema.object({
    objectType: schema.string(),
    layout: schema.maybe(rawLayoutIdSchema),
    isDeprecated: schema.maybe(schema.boolean()),
  }),
  schedule: rawScheduleSchema,
  notification: schema.maybe(rawNotificationSchema),
});
