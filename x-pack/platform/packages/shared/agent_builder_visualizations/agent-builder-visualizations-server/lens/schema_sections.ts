/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, omit, pick, uniq } from 'lodash';
import { z } from '@kbn/zod';
import { xyConfigSchemaESQL } from '@kbn/lens-embeddable-utils';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';
import { toJsonSchema } from './json_schema_utils';
import { buildSchemaSectionIndex } from './schema_section_index';

export const LOAD_SCHEMA_SECTIONS_TOOL_NAME = 'load_schema_sections';

/** `type` is set by every example, and the system injects `data_source`. */
const EXCLUDED_KEYS = ['type', 'data_source'] as const;

interface ChartSchemaSections {
  /** The top-level config keys the model can load. */
  schema: z.ZodObject;
  /** One line per section that lists the fields it holds. */
  index: string;
}

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

const buildSchemaSections = (schema: z.ZodObject): ChartSchemaSections => {
  const { properties = {}, $defs = {} } = toJsonSchema(schema);
  return { schema, index: buildSchemaSectionIndex(properties, $defs) };
};

const chartSchemaSections = mapValues(chartTypeRegistry, ({ schema }, chartType) =>
  buildSchemaSections(
    chartType === SupportedChartType.XY ? xySectionsSchema : toSectionsSchema(schema)
  )
);

/** Names of the sections the config author can load for a chart type. */
export const getSchemaSectionNames = (chartType: SupportedChartType): string[] =>
  Object.keys(chartSchemaSections[chartType].schema.shape);

/** Lists the loadable sections of a chart type with the fields each one holds. */
export const getSchemaSectionIndex = (chartType: SupportedChartType): string =>
  chartSchemaSections[chartType].index;

/** Renders the JSON schema of the given sections, with the definitions they reference. */
export const renderSchemaSections = (
  chartType: SupportedChartType,
  sectionNames: readonly string[]
): string => {
  const { shape } = chartSchemaSections[chartType].schema;
  const { properties, $defs } = toJsonSchema(z.object(pick(shape, sectionNames)));
  return JSON.stringify({ properties, ...($defs ? { $defs } : {}) });
};

/** Keeps the names that are loadable sections of the chart type. */
export const filterSchemaSections = (
  chartType: SupportedChartType,
  names: readonly unknown[]
): string[] => {
  const { shape } = chartSchemaSections[chartType].schema;
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
