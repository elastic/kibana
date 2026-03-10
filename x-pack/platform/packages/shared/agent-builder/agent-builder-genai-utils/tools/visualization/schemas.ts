/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import parse from 'joi-to-json';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';

const jsonSchemas = Object.fromEntries(
  Object.entries(chartTypeRegistry).map(([chartType, { schema }]) => [
    chartType,
    parse(schema.getSchema()) as object,
  ])
) as Record<SupportedChartType, object>;

export const getSchemaForChartType = (chartType: SupportedChartType): object =>
  jsonSchemas[chartType];
