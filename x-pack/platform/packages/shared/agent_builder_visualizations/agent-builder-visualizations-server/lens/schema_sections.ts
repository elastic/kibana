/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memoize, omit, pick, uniq } from 'lodash';
import { z } from '@kbn/zod';
import { xyConfigSchemaESQL } from '@kbn/lens-embeddable-utils';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';
import { buildSchemaSectionIndex } from './schema_section_index';

export const LOAD_SCHEMA_SECTIONS_TOOL_NAME = 'load_schema_sections';

/**
 * Matches descriptions that carry constraint or usage info worth keeping
 * in the LLM prompt (numbers, ranges, defaults, examples, units).
 * Everything else (e.g. "Label for the operation") is stripped to save tokens.
 */
const USEFUL_DESCRIPTION_RE =
  /(\d|default|e\.g\.|i\.e\.|example|must|between|minimum|maximum|at least|at most|up to|pixels|millisecond|factor|typical|legacy|truncat)/i;

/** `type` is set by every example, and the system injects `data_source`. */
const EXCLUDED_KEYS = ['type', 'data_source'] as const;

/** The JSON schema of a zod object's input, without descriptions that carry no constraint or usage info. */
const toJsonSchema = (schema: z.ZodObject): { properties?: object; $defs?: object } =>
  JSON.parse(JSON.stringify(z.toJSONSchema(schema, { io: 'input' })), (key, value) =>
    key === 'description' && typeof value === 'string' && !USEFUL_DESCRIPTION_RE.test(value)
      ? undefined
      : value
  );

/** Rebuilds a chart config schema with only the top-level keys the model can load. */
const toSectionsSchema = ({ shape }: z.ZodObject): z.ZodObject =>
  z.object(omit(shape, EXCLUDED_KEYS));

/**
 * XY sections describe ES|QL data layers only. The system injects an ES|QL
 * `data_source` into every layer, which reference line and annotation layers reject.
 */
const [xyDataLayerSchema] = xyConfigSchemaESQL.shape.layers.element.options;
const xySectionsSchema = toSectionsSchema(xyConfigSchemaESQL).extend({
  layers: z.array(xyDataLayerSchema.omit({ data_source: true })).min(1),
});

/** The top-level config keys the model can load for a chart type. */
const getSectionsSchema = memoize(
  (chartType: SupportedChartType): z.ZodObject =>
    chartType === SupportedChartType.XY
      ? xySectionsSchema
      : toSectionsSchema(chartTypeRegistry[chartType].schema)
);

/** Names of the sections the config author can load for a chart type. */
export const getSchemaSectionNames = (chartType: SupportedChartType): string[] =>
  Object.keys(getSectionsSchema(chartType).shape);

/** Lists the loadable sections of a chart type with the fields each one holds. */
export const getSchemaSectionIndex = memoize((chartType: SupportedChartType): string =>
  buildSchemaSectionIndex(getSectionsSchema(chartType))
);

/** Renders the JSON schema of the given sections, with the definitions they reference. */
export const renderSchemaSections = (
  chartType: SupportedChartType,
  sectionNames: readonly string[]
): string => {
  const { shape } = getSectionsSchema(chartType);
  const { properties, $defs } = toJsonSchema(z.object(pick(shape, sectionNames)));
  return JSON.stringify({ properties, ...($defs ? { $defs } : {}) });
};

/** Keeps the names that are loadable sections of the chart type. */
export const filterSchemaSections = (
  chartType: SupportedChartType,
  names: readonly unknown[]
): string[] => {
  const { shape } = getSectionsSchema(chartType);
  return uniq(names).filter(
    (name): name is string => typeof name === 'string' && Object.hasOwn(shape, name)
  );
};

/** Sections that hold the fields a config validation error points at. */
export const getFailingSchemaSections = (chartType: SupportedChartType, error: unknown): string[] =>
  error instanceof z.ZodError
    ? filterSchemaSections(
        chartType,
        error.issues.map(({ path: [section] }) => section)
      )
    : [];

/** The bounded tool the config author calls to load schema sections the example does not show. */
export const createLoadSchemaSectionsTool = (chartType: SupportedChartType) => {
  const names = getSchemaSectionNames(chartType);
  return {
    name: LOAD_SCHEMA_SECTIONS_TOOL_NAME,
    description:
      'Returns the JSON schema of the listed configuration sections. Call it at most once, listing every section the request needs that the example does not show.',
    schema: z.object({
      sections: z.array(z.enum(names)).min(1).max(names.length),
    }),
  };
};
