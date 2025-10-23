/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, FilterMeta } from '@kbn/es-query';
import type { Position } from '@elastic/charts';
import type { $Values } from '@kbn/utility-types';
import type { CustomPaletteParams, PaletteOutput, ColorMapping } from '@kbn/coloring';
import type { ColorMode } from '@kbn/charts-plugin/common';
import type { PartitionLegendValue } from '@kbn/expression-partition-vis-plugin/common';
import type { LegendSize } from '@kbn/chart-expressions-common';
import type { CategoryDisplay, LegendDisplay, NumberDisplay, PieChartTypes } from './constants';
import type { layerTypes } from './layer_types';
import type { CollapseFunction } from './expressions';

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

export type LayerType = (typeof layerTypes)[keyof typeof layerTypes];

export type ValueLabelConfig = 'hide' | 'show';

export type PieChartType = $Values<typeof PieChartTypes>;
type CategoryDisplayType = $Values<typeof CategoryDisplay>;
type NumberDisplayType = $Values<typeof NumberDisplay>;

type LegendDisplayType = $Values<typeof LegendDisplay>;

export enum EmptySizeRatios {
  SMALL = 0.3,
  MEDIUM = 0.54,
  LARGE = 0.7,
}

export interface SharedPieLayerState {
  metrics: string[];
  primaryGroups: string[];
  secondaryGroups?: string[];
  allowMultipleMetrics?: boolean;
  colorsByDimension?: Record<string, string>;
  collapseFns?: Record<string, CollapseFunction>;
  numberDisplay: NumberDisplayType;
  categoryDisplay: CategoryDisplayType;
  legendDisplay: LegendDisplayType;
  legendPosition?: Position;
  legendStats?: PartitionLegendValue[];
  nestedLegend?: boolean;
  percentDecimals?: number;
  emptySizeRatio?: number;
  legendMaxLines?: number;
  legendSize?: LegendSize;
  truncateLegend?: boolean;
  colorMapping?: ColorMapping.Config;
}

export type PieLayerState = SharedPieLayerState & {
  layerId: string;
  layerType: LayerType;
};

export interface PieVisualizationState {
  shape: $Values<typeof PieChartTypes>;
  layers: PieLayerState[];
  /**
   * @deprecated use `layer.colorMapping` config
   */
  palette?: PaletteOutput;
}

export interface LegacyMetricState {
  autoScaleMetricAlignment?: 'left' | 'right' | 'center';
  layerId: string;
  accessor?: string;
  layerType: LayerType;
  colorMode?: ColorMode;
  palette?: PaletteOutput<CustomPaletteParams>;
  titlePosition?: 'top' | 'bottom';
  size?: string;
  textAlign?: 'left' | 'right' | 'center';
}

export enum RowHeightMode {
  auto = 'auto',
  custom = 'custom',
}

export interface ValueFormatConfig {
  id: string;
  params?: {
    decimals: number;
    suffix?: string;
    compact?: boolean;
    pattern?: string;
    fromUnit?: string;
    toUnit?: string;
  };
}
