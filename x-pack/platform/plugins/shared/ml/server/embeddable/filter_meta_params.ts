/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { Serializable } from '@kbn/utility-types';

import { filterSchema } from './filter';
import { filterMetaObjectSchema } from './filter_meta';

const serializableId = 'serializableSchemaId';
const serializableRecordId = 'serializableRecordSchemaId';
const rangeFilterMetaId = 'rangeFilterMetaId';

export const serializableSchema = schema.lazy<Serializable>(serializableId);

const serializableRecordObjectSchema = schema.object(
  {
    value: schema.recordOf(schema.string(), serializableSchema),
  },
  { meta: { id: serializableRecordId } }
);

export const serializableObjectSchema = schema.object(
  {
    value: schema.oneOf([
      schema.string(),
      schema.number(),
      schema.boolean(),
      schema.nullable(schema.any()),
      schema.arrayOf(serializableSchema),
      schema.recordOf(schema.string(), serializableSchema),
    ]),
  },
  { meta: { id: serializableId } }
);

export const rangeFilterParamsSchema = schema.object({
  from: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  to: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  gt: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  lt: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  gte: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  lte: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
  format: schema.maybe(schema.string()),
});

export const rangeFilterMetaSchema = schema.object(
  {
    ...filterMetaObjectSchema.getPropSchemas(),
    params: schema.maybe(rangeFilterParamsSchema),
    field: schema.maybe(schema.string()),
    formattedValue: schema.maybe(schema.string()),
    type: schema.literal('range'),
  },
  { meta: { id: rangeFilterMetaId } }
);

export const phraseFilterValueSchema = schema.oneOf([
  schema.string(),
  schema.number(),
  schema.boolean(),
]);

const phraseFilterMetaSchema = schema.object({
  ...filterMetaObjectSchema.getPropSchemas(),
  params: schema.maybe(
    schema.object({
      query: schema.maybe(phraseFilterValueSchema),
    })
  ),
  field: schema.maybe(schema.string()),
  index: schema.maybe(schema.string()),
});

const phraseFilterMetaParamsId = 'phraseFilterMetaParamsSchema';

export const phraseFilterMetaParamsSchema = schema.object(
  {
    query: phraseFilterValueSchema,
    values: serializableRecordObjectSchema,
  },
  { meta: { id: phraseFilterMetaParamsId } }
);

const phrasesFilterMetaSchema = schema.object({
  ...filterMetaObjectSchema.getPropSchemas(),
  params: schema.maybe(schema.arrayOf(phraseFilterValueSchema)),
  field: schema.maybe(schema.string()),
});

const matchAllFilterMetaSchema = schema.object({
  ...filterMetaObjectSchema.getPropSchemas(),
  values: schema.recordOf(schema.string(), serializableSchema),
  field: schema.string(),
  formattedValue: schema.string(),
});

const filterMetaParamsId = 'filterMetaParamsId';

export const filterMetaParamsObjectSchema = schema.object(
  {
    values: schema.oneOf([
      schema.oneOf([
        filterSchema,
        schema.arrayOf(filterSchema),
        rangeFilterMetaSchema,
        rangeFilterParamsSchema,
        phraseFilterMetaSchema,
        phraseFilterMetaParamsSchema,
        phrasesFilterMetaSchema,
        matchAllFilterMetaSchema,
        schema.string(),
        schema.arrayOf(schema.string()),
        schema.boolean(),
        schema.arrayOf(schema.boolean()),
      ]),
      schema.number(),
      schema.arrayOf(schema.number()),
    ]),
  },
  { meta: { id: filterMetaParamsId } }
);

export const filterMetaParamsSchema = schema.lazy(filterMetaParamsId);
