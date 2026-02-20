/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import path from 'path';
import { schema } from '@kbn/config-schema';
import { backfillResponseSchemaV1 } from '../../../response';
import { backfillInitiator } from '../../../../../constants';

export const findBackfillExamples = () => path.join(__dirname, 'examples_find_backfill.yaml');

export const findQuerySchema = schema.object(
  {
    end: schema.maybe(
      schema.string({
        meta: { description: 'The end date for filtering backfills.' },
      })
    ),
    page: schema.number({
      defaultValue: 1,
      min: 1,
      meta: { description: 'The page number to return.' },
    }),
    per_page: schema.number({
      defaultValue: 10,
      min: 0,
      meta: { description: 'The number of backfills to return per page.' },
    }),
    rule_ids: schema.maybe(
      schema.string({
        meta: { description: 'A comma-separated list of rule identifiers.' },
      })
    ),
    initiator: schema.maybe(
      schema.oneOf(
        [schema.literal(backfillInitiator.USER), schema.literal(backfillInitiator.SYSTEM)],
        {
          meta: {
            description:
              'The initiator of the backfill, either `user` for manual backfills or `system` for automatic gap fills.',
          },
        }
      )
    ),
    start: schema.maybe(
      schema.string({
        meta: { description: 'The start date for filtering backfills.' },
      })
    ),
    sort_field: schema.maybe(
      schema.oneOf([schema.literal('createdAt'), schema.literal('start')], {
        meta: { description: 'The field to sort backfills by.' },
      })
    ),
    sort_order: schema.maybe(
      schema.oneOf([schema.literal('asc'), schema.literal('desc')], {
        meta: { description: 'The sort order.' },
      })
    ),
  },
  {
    validate({ start, end }) {
      if (start) {
        const parsedStart = Date.parse(start);
        if (isNaN(parsedStart)) {
          return `[start]: query start must be valid date`;
        }
      }
      if (end) {
        const parsedEnd = Date.parse(end);
        if (isNaN(parsedEnd)) {
          return `[end]: query end must be valid date`;
        }
      }
    },
  }
);

export const findResponseSchema = schema.object({
  page: schema.number(),
  per_page: schema.number(),
  total: schema.number(),
  data: schema.arrayOf(backfillResponseSchemaV1),
});
