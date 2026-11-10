/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  DEFAULT_FACET_SIZE,
  DEFAULT_PAGE_SIZE,
  MAX_COLUMNS,
  MAX_ESQL_PARAMS,
  MAX_FACETS,
  MAX_FACET_SIZE,
  MAX_FIELD_NAME_LENGTH,
  MAX_FILTERS,
  MAX_INDEX_NAME_LENGTH,
  MAX_PAGE_SIZE,
  MAX_QUERY_LENGTH,
  MAX_RESULT_WINDOW,
  MAX_VALUE_LENGTH,
} from '../../common/constants';

const fieldNameSchema = schema.string({ minLength: 1, maxLength: MAX_FIELD_NAME_LENGTH });

export const indexParamsSchema = schema.object({
  index: schema.string({ minLength: 1, maxLength: MAX_INDEX_NAME_LENGTH }),
});

export const documentParamsSchema = schema.object({
  index: schema.string({ minLength: 1, maxLength: MAX_INDEX_NAME_LENGTH }),
  id: schema.string({ minLength: 1, maxLength: 512 }),
});

export const listIndicesQuerySchema = schema.object({
  includeHidden: schema.boolean({ defaultValue: false }),
});

export const fieldValuesQuerySchema = schema.object({ field: fieldNameSchema });

const filterSchema = schema.object({
  field: fieldNameSchema,
  operator: schema.oneOf([
    schema.literal('exact'),
    schema.literal('not'),
    schema.literal('contains'),
    schema.literal('startswith'),
    schema.literal('gt'),
    schema.literal('gte'),
    schema.literal('lt'),
    schema.literal('lte'),
    schema.literal('in'),
    schema.literal('notin'),
    schema.literal('exists'),
    schema.literal('missing'),
  ]),
  value: schema.string({ maxLength: MAX_VALUE_LENGTH, defaultValue: '' }),
});

const sortSchema = schema.object({
  field: fieldNameSchema,
  direction: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
});

const queryStateProps = {
  filters: schema.arrayOf(filterSchema, { maxSize: MAX_FILTERS, defaultValue: [] }),
  search: schema.maybe(schema.string({ maxLength: MAX_VALUE_LENGTH })),
  sort: schema.maybe(sortSchema),
  columns: schema.arrayOf(fieldNameSchema, { maxSize: MAX_COLUMNS, defaultValue: [] }),
  hiddenColumns: schema.arrayOf(fieldNameSchema, { maxSize: MAX_COLUMNS, defaultValue: [] }),
};

export const searchBodySchema = schema.object(
  {
    ...queryStateProps,
    from: schema.number({ min: 0, max: MAX_RESULT_WINDOW - 1, defaultValue: 0 }),
    size: schema.number({ min: 0, max: MAX_PAGE_SIZE, defaultValue: DEFAULT_PAGE_SIZE }),
    facets: schema.arrayOf(fieldNameSchema, { maxSize: MAX_FACETS, defaultValue: [] }),
    facetSize: schema.number({ min: 1, max: MAX_FACET_SIZE, defaultValue: DEFAULT_FACET_SIZE }),
    suggestFacets: schema.boolean({ defaultValue: false }),
  },
  {
    validate({ from, size }) {
      return from + size > MAX_RESULT_WINDOW
        ? `from + size must not exceed ${MAX_RESULT_WINDOW}; use export for larger result sets`
        : undefined;
    },
  }
);

export const histogramBodySchema = schema.object({
  filters: queryStateProps.filters,
  search: queryStateProps.search,
});

const exportFormatSchema = schema.oneOf([schema.literal('csv'), schema.literal('json')]);

export const exportIndexBodySchema = schema.object({
  ...queryStateProps,
  format: exportFormatSchema,
});

const esqlBodyProps = {
  query: schema.string({ minLength: 1, maxLength: MAX_QUERY_LENGTH }),
  params: schema.arrayOf(
    schema.object({
      name: schema.string({ minLength: 1, maxLength: 256 }),
      type: schema.oneOf([
        schema.literal('string'),
        schema.literal('number'),
        schema.literal('boolean'),
      ]),
      value: schema.string({ maxLength: MAX_VALUE_LENGTH }),
    }),
    { maxSize: MAX_ESQL_PARAMS, defaultValue: [] }
  ),
};

export const esqlBodySchema = schema.object(esqlBodyProps);

export const exportEsqlBodySchema = schema.object({
  ...esqlBodyProps,
  format: exportFormatSchema,
});
