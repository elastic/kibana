/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import parse from 'joi-to-json';
import { esqlMetricState } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/metric';
import { gaugeStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/gauge';
import { tagcloudStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/tagcloud';
import { xyStateSchema } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/xy';
import { regionMapStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/region_map';
import { heatmapStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/heatmap';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

/**
 * Parsed JSON schemas for each supported chart type.
 * These are used to validate LLM-generated visualization configurations.
 */
const chartSchemas: Record<SupportedChartType, object> = {
  [SupportedChartType.Metric]: parse(esqlMetricState.getSchema()) as object,
  [SupportedChartType.Gauge]: parse(gaugeStateSchemaESQL.getSchema()) as object,
  [SupportedChartType.Tagcloud]: parse(tagcloudStateSchemaESQL.getSchema()) as object,
  [SupportedChartType.XY]: parse(xyStateSchema.getSchema()) as object,
  [SupportedChartType.RegionMap]: parse(regionMapStateSchemaESQL.getSchema()) as object,
  [SupportedChartType.Heatmap]: parse(heatmapStateSchemaESQL.getSchema()) as object,
};

/**
 * Returns the JSON schema for a given chart type.
 * Defaults to metric schema if chart type is not found.
 */
export function getSchemaForChartType(chartType: SupportedChartType): object {
  return chartSchemas[chartType] ?? chartSchemas[SupportedChartType.Metric];
}
