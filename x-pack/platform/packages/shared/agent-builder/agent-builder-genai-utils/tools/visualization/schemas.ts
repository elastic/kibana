/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import parse from 'joi-to-json';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { esqlMetricState } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/metric';
import { gaugeStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/gauge';
import { tagcloudStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/tagcloud';
import { xyStateSchema } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/xy';
import { regionMapStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/region_map';
import { heatmapStateSchemaESQL } from '@kbn/lens-embeddable-utils/config_builder/schema/charts/heatmap';

export const metricSchema = parse(esqlMetricState.getSchema()) as object;
export const gaugeSchema = parse(gaugeStateSchemaESQL.getSchema()) as object;
export const tagcloudSchema = parse(tagcloudStateSchemaESQL.getSchema()) as object;
export const xySchema = parse(xyStateSchema.getSchema()) as object;
export const regionMapSchema = parse(regionMapStateSchemaESQL.getSchema()) as object;
export const heatmapSchema = parse(heatmapStateSchemaESQL.getSchema()) as object;

export function getSchemaForChartType(chartType: SupportedChartType): object {
  switch (chartType) {
    case SupportedChartType.Gauge:
      return gaugeSchema;
    case SupportedChartType.Tagcloud:
      return tagcloudSchema;
    case SupportedChartType.XY:
      return xySchema;
    case SupportedChartType.RegionMap:
      return regionMapSchema;
    case SupportedChartType.Heatmap:
      return heatmapSchema;
    default:
      return metricSchema;
  }
}
