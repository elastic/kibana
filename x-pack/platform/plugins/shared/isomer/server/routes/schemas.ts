/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { querySchema, storedFilterSchema, timeRangeSchema } from '@kbn/es-query-server';
import { ESQLVariableType } from '@kbn/esql-types';
import { z, lazySchema } from '@kbn/zod';

const typeSchema = lazySchema(() =>
  z.string().min(1).max(256).meta({
    description: 'The saved object type to materialize, for example `lens`.',
  })
);

const byReferenceSchema = lazySchema(() =>
  z
    .object({
      type: typeSchema,
      id: z.string().min(1).max(1024).meta({ description: 'The saved object ID.' }),
    })
    .strict()
);

const byValueSchema = lazySchema(() =>
  z
    .object({
      type: typeSchema,
      config: z.record(z.string(), z.unknown()).meta({
        description: "The saved object type's as-code config, as its API returns it.",
      }),
    })
    .strict()
);

const esqlVariableSchema = lazySchema(() =>
  z
    .object({
      key: z.string().min(1).max(256),
      value: z.union([
        z.string().max(10_000),
        z.number(),
        z.array(z.union([z.string().max(10_000), z.number()])).max(1_000),
      ]),
      type: z.enum(ESQLVariableType),
    })
    .strict()
);

const contextSchema = lazySchema(() =>
  z
    .object({
      time_range: timeRangeSchema.optional(),
      query: querySchema.optional(),
      filters: z.array(storedFilterSchema).max(500).optional(),
      esql_variables: z.array(esqlVariableSchema).max(100).optional(),
      time_zone: z.string().min(1).max(64).optional().meta({
        description: 'Defaults to the `dateFormat:tz` advanced setting.',
      }),
      locale: z.string().min(1).max(35).optional(),
    })
    .strict()
);

export const materializeRequestBodySchema = lazySchema(() =>
  z
    .object({
      input: z.union([byReferenceSchema, byValueSchema]),
      context: contextSchema.optional(),
    })
    .strict()
);

export type MaterializeRequestBody = z.infer<typeof materializeRequestBodySchema>;

export const materializeResponseBodySchema = lazySchema(() =>
  z
    .object({
      type: z.literal('view'),
      title: z.string().optional(),
      body: z.array(z.looseObject({ type: z.string() })).length(1),
      meta: z.looseObject({}).optional(),
    })
    .strict()
    .meta({
      description:
        'An Isomer composition holding the materialized node, or an `unsupported` node that says why there is none.',
    })
);
