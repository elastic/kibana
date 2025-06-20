/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, FilterMeta } from '@kbn/es-query';

export type { OriginalColumn } from './expressions/defs/map_to_columns';
export type { AllowedPartitionOverrides } from '@kbn/expression-partition-vis-plugin/common';
export type { AllowedSettingsOverrides, AllowedChartOverrides } from '@kbn/charts-plugin/common';
export type { AllowedGaugeOverrides } from '@kbn/expression-gauge-plugin/common';
export type { AllowedXYOverrides } from '@kbn/expression-xy-plugin/common';
export type { FormatFactory } from '@kbn/visualization-ui-components';

export interface DateRange {
  fromDate: string;
  toDate: string;
}

interface PersistableFilterMeta extends FilterMeta {
  indexRefName?: string;
}

export interface PersistableFilter extends Filter {
  meta: PersistableFilterMeta;
}

export type SortingHint = string;

export type ValueLabelConfig = 'hide' | 'show';
