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

const MAX_CONFIG_NODES = 10_000;
const MAX_CONFIG_DEPTH = 20;
const MAX_CONFIG_STRING_LENGTH = 100_000;
const MAX_CONFIG_KEY_LENGTH = 256;

const byValueConfigSchema = lazySchema(() =>
  z.record(z.string(), z.unknown()).superRefine((config, validation) => {
    const pending: Array<{ value: unknown; path: Array<string | number>; depth: number }> = [
      { value: config, path: [], depth: 0 },
    ];
    let visited = 0;
    while (pending.length > 0) {
      const current = pending.pop();
      if (!current) {
        continue;
      }
      if (++visited > MAX_CONFIG_NODES) {
        validation.addIssue({
          code: 'custom',
          message: `Config must contain at most ${MAX_CONFIG_NODES} values.`,
          path: current.path,
        });
        return;
      }
      if (current.depth > MAX_CONFIG_DEPTH) {
        validation.addIssue({
          code: 'custom',
          message: `Config must be no more than ${MAX_CONFIG_DEPTH} levels deep.`,
          path: current.path,
        });
        return;
      }
      if (typeof current.value === 'string') {
        if (current.value.length > MAX_CONFIG_STRING_LENGTH) {
          validation.addIssue({
            code: 'custom',
            message: `Config strings must be no longer than ${MAX_CONFIG_STRING_LENGTH} characters.`,
            path: current.path,
          });
          return;
        }
        continue;
      }
      if (Array.isArray(current.value)) {
        current.value.forEach((value, index) =>
          pending.push({ value, path: [...current.path, index], depth: current.depth + 1 })
        );
        continue;
      }
      if (current.value !== null && typeof current.value === 'object') {
        for (const [key, value] of Object.entries(current.value)) {
          if (key.length > MAX_CONFIG_KEY_LENGTH) {
            validation.addIssue({
              code: 'custom',
              message: `Config keys must be no longer than ${MAX_CONFIG_KEY_LENGTH} characters.`,
              path: [...current.path, key],
            });
            return;
          }
          pending.push({ value, path: [...current.path, key], depth: current.depth + 1 });
        }
      }
    }
  })
);

const byValueSchema = lazySchema(() =>
  z
    .object({
      type: typeSchema,
      config: byValueConfigSchema.meta({
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
      meta: z
        .object({
          controlledBy: z.string().max(256).optional(),
          group: z.string().max(256).optional(),
        })
        .strict()
        .optional(),
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
        description: 'Optional time zone for date formatting; the API does not supply a default.',
      }),
      locale: z.string().min(1).max(35).optional(),
    })
    .strict()
);

/** Validates the bounded request body for the materialize API. */
export const materializeRequestBodySchema = lazySchema(() =>
  z
    .object({
      input: z.union([byReferenceSchema, byValueSchema]),
      context: contextSchema.optional(),
    })
    .strict()
);

/** Validates a request to materialize content and draw it to a PNG. */
export const renderPngRequestBodySchema = lazySchema(() =>
  z
    .object({
      input: z.union([byReferenceSchema, byValueSchema]),
      context: contextSchema.optional(),
      image: z
        .object({
          scheme: z.enum(['light', 'dark']).optional().meta({
            description: "The color scheme. Default: the user's `theme:darkMode`.",
          }),
          scale: z.number().min(1).max(2).optional().meta({
            description: 'Device pixels per CSS pixel, 1 to 2. Default 2.',
          }),
          width: z.number().int().min(160).max(1920).optional().meta({
            description:
              'The image width in CSS pixels. Default 512, one chart at its laid-out width.',
          }),
        })
        .strict()
        .optional(),
    })
    .strict()
);

/** The validated body accepted by the render PNG route. */
export type RenderPngRequestBody = z.infer<typeof renderPngRequestBodySchema>;

/** The validated body accepted by the materialize API. */
export type MaterializeRequestBody = z.infer<typeof materializeRequestBodySchema>;

/** Validates the one-node composition returned by the materialize API. */
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

const columnIdSchema = lazySchema(() => z.string().min(1).max(1024));

const cellSchema = lazySchema(() =>
  z.union([
    z.string().max(10_000),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.union([z.string().max(10_000), z.number(), z.boolean(), z.null()])).max(1_000),
  ])
);

const eventSharedShape = {
  node: lazySchema(() => z.string().min(1).max(1024)),
  description: lazySchema(() => z.string().max(10_000)),
  values: lazySchema(() => z.record(columnIdSchema, cellSchema)),
};

export const chartEventBodySchema = lazySchema(() =>
  z.discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('select'),
        target: z.enum(['datum', 'series', 'category', 'legend', 'cell', 'tile', 'slice', 'tag']),
        // An xy `datum`, `series` or `legend` event names its series (elastic/isomer charts).
        seriesKey: z.string().max(10_000).optional(),
        series: z
          .object({ layer: z.number().int().min(0), y: z.number().int().min(0) })
          .strict()
          .optional(),
        rows: z.array(z.number().int().min(0)).min(1).max(10_000),
        columns: z.array(columnIdSchema).max(100),
        negate: z.boolean().optional(),
        ...eventSharedShape,
      })
      .strict(),
    z
      .object({
        kind: z.literal('brush'),
        column: columnIdSchema,
        range: z.tuple([z.number(), z.number()]),
        ...eventSharedShape,
      })
      .strict(),
  ])
);

export const filtersForSelectionRequestBodySchema = lazySchema(() =>
  z
    .object({
      event: chartEventBodySchema.meta({
        description: 'The `chart.select` or `chart.brush` event a renderer raised on the node.',
      }),
      node: z.looseObject({ type: z.string().min(1).max(256) }).meta({
        description:
          'The materialized node the event refers to, as `POST /api/isomer/materialize` returned it.',
      }),
    })
    .strict()
);

export const filtersForSelectionResponseBodySchema = lazySchema(() =>
  z
    .object({ filters: z.array(storedFilterSchema) })
    .strict()
    .meta({
      description:
        'The Kibana filters the selection stands for. Keep them and pass them back in `context.filters` to materialize again.',
    })
);
