/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  datatableConfigSchemaESQL,
  datatableConfigSchemaNoESQL,
  gaugeConfigSchemaESQL,
  gaugeConfigSchemaNoESQL,
  heatmapConfigSchemaESQL,
  heatmapConfigSchemaNoESQL,
  metricConfigSchemaESQL,
  metricConfigSchemaNoESQL,
  mosaicConfigSchemaESQL,
  mosaicConfigSchemaNoESQL,
  pieConfigSchemaESQL,
  pieConfigSchemaNoESQL,
  regionMapConfigSchemaESQL,
  regionMapConfigSchemaNoESQL,
  tagcloudConfigSchemaESQL,
  tagcloudConfigSchemaNoESQL,
  treemapConfigSchemaESQL,
  treemapConfigSchemaNoESQL,
  waffleConfigSchemaESQL,
  waffleConfigSchemaNoESQL,
  xyConfigSchemaESQL,
  xyConfigSchemaNoESQL,
} from '@kbn/lens-embeddable-utils';
import type { z } from '@kbn/zod';

export interface ChartSchemaPair {
  esql: z.ZodType;
  noEsql: z.ZodType;
}

export const CHART_SCHEMAS: Record<SupportedChartType, ChartSchemaPair> = {
  [SupportedChartType.Metric]: {
    esql: metricConfigSchemaESQL,
    noEsql: metricConfigSchemaNoESQL,
  },
  [SupportedChartType.Gauge]: {
    esql: gaugeConfigSchemaESQL,
    noEsql: gaugeConfigSchemaNoESQL,
  },
  [SupportedChartType.XY]: {
    esql: xyConfigSchemaESQL,
    noEsql: xyConfigSchemaNoESQL,
  },
  [SupportedChartType.Heatmap]: {
    esql: heatmapConfigSchemaESQL,
    noEsql: heatmapConfigSchemaNoESQL,
  },
  [SupportedChartType.Tagcloud]: {
    esql: tagcloudConfigSchemaESQL,
    noEsql: tagcloudConfigSchemaNoESQL,
  },
  [SupportedChartType.RegionMap]: {
    esql: regionMapConfigSchemaESQL,
    noEsql: regionMapConfigSchemaNoESQL,
  },
  [SupportedChartType.Datatable]: {
    esql: datatableConfigSchemaESQL,
    noEsql: datatableConfigSchemaNoESQL,
  },
  [SupportedChartType.Pie]: {
    esql: pieConfigSchemaESQL,
    noEsql: pieConfigSchemaNoESQL,
  },
  [SupportedChartType.Treemap]: {
    esql: treemapConfigSchemaESQL,
    noEsql: treemapConfigSchemaNoESQL,
  },
  [SupportedChartType.Waffle]: {
    esql: waffleConfigSchemaESQL,
    noEsql: waffleConfigSchemaNoESQL,
  },
  [SupportedChartType.Mosaic]: {
    esql: mosaicConfigSchemaESQL,
    noEsql: mosaicConfigSchemaNoESQL,
  },
};

export const isSupportedChartType = (value: unknown): value is SupportedChartType =>
  typeof value === 'string' && value in CHART_SCHEMAS;

export const schemaForConfig = (config: Record<string, unknown>): z.ZodType | undefined => {
  if (!isSupportedChartType(config.type)) {
    return undefined;
  }
  const carrier = Array.isArray(config.layers) ? config.layers[0] : config;
  const dataSource =
    carrier && typeof carrier === 'object' && 'data_source' in carrier
      ? (carrier as { data_source?: { type?: string } }).data_source
      : undefined;
  return dataSource?.type === 'esql'
    ? CHART_SCHEMAS[config.type].esql
    : CHART_SCHEMAS[config.type].noEsql;
};
