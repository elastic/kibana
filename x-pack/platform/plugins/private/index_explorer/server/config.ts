/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';
import { MAX_RESULT_WINDOW } from '../common/constants';

const QUERY_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const paramTypeSchema = schema.oneOf([
  schema.literal('string'),
  schema.literal('number'),
  schema.literal('boolean'),
]);

const cannedQuerySchema = schema.object({
  id: schema.string({
    validate(value) {
      return QUERY_ID_PATTERN.test(value)
        ? undefined
        : 'must only contain letters, digits, "-" and "_"';
    },
  }),
  title: schema.string(),
  description: schema.maybe(schema.string()),
  query: schema.string(),
  params: schema.arrayOf(
    schema.object({
      name: schema.string(),
      type: paramTypeSchema,
      default: schema.maybe(schema.string()),
    }),
    { defaultValue: [] }
  ),
});

const indexMetadataSchema = schema.object({
  title: schema.maybe(schema.string()),
  description: schema.maybe(schema.string()),
  facets: schema.arrayOf(schema.string(), { defaultValue: [] }),
  columns: schema.arrayOf(schema.string(), { defaultValue: [] }),
});

export const configSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  title: schema.maybe(schema.string()),
  description: schema.maybe(schema.string()),
  maxExportRows: schema.number({ defaultValue: MAX_RESULT_WINDOW, min: 1, max: MAX_RESULT_WINDOW }),
  queries: schema.arrayOf(cannedQuerySchema, {
    defaultValue: [],
    validate(queries) {
      const ids = queries.map(({ id }) => id);
      const duplicate = ids.find((id, position) => ids.indexOf(id) !== position);
      return duplicate ? `duplicate canned query id "${duplicate}"` : undefined;
    },
  }),
  indices: schema.recordOf(schema.string(), indexMetadataSchema, { defaultValue: {} }),
});

export type IndexExplorerConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<IndexExplorerConfig> = {
  schema: configSchema,
};
