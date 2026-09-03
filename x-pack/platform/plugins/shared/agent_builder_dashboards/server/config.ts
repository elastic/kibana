/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { schema, type TypeOf } from '@kbn/config-schema';
import type { PluginConfigDescriptor } from '@kbn/core/server';

export const ALL_SUPPORTED_CHART_TYPES: SupportedChartType[] = Object.values(SupportedChartType);

const chartTypeSchema = schema.oneOf([
  schema.literal(SupportedChartType.Metric),
  schema.literal(SupportedChartType.Gauge),
  schema.literal(SupportedChartType.Tagcloud),
  schema.literal(SupportedChartType.XY),
  schema.literal(SupportedChartType.RegionMap),
  schema.literal(SupportedChartType.Heatmap),
  schema.literal(SupportedChartType.Datatable),
  schema.literal(SupportedChartType.Pie),
  schema.literal(SupportedChartType.Treemap),
  schema.literal(SupportedChartType.Waffle),
  schema.literal(SupportedChartType.Mosaic),
]);

export const configSchema = schema.object({
  compileAllowList: schema.maybe(schema.arrayOf(chartTypeSchema, { maxSize: 11 })),
});

export type AgentBuilderDashboardsConfig = TypeOf<typeof configSchema>;

export const config: PluginConfigDescriptor<AgentBuilderDashboardsConfig> = {
  schema: configSchema,
};

export const resolveCompileAllowList = (raw: unknown): SupportedChartType[] => {
  if (raw === null || typeof raw !== 'object') {
    return ALL_SUPPORTED_CHART_TYPES;
  }

  const list = (raw as { compileAllowList?: unknown }).compileAllowList;
  if (!Array.isArray(list) || list.length === 0) {
    return ALL_SUPPORTED_CHART_TYPES;
  }

  const allowed = new Set<string>(ALL_SUPPORTED_CHART_TYPES);
  const valid = list.filter(
    (item): item is SupportedChartType => typeof item === 'string' && allowed.has(item)
  );
  return valid.length > 0 ? valid : ALL_SUPPORTED_CHART_TYPES;
};
