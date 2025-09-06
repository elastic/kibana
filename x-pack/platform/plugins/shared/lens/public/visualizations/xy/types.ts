/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { $Values } from '@kbn/utility-types';
import type { ColorMapping, PaletteOutput } from '@kbn/coloring';
import type {
  LegendConfig,
  AxisExtentConfig,
  XYCurveType,
  FittingFunction,
  EndValue,
  YScaleType,
  XScaleType,
  LineStyle,
  IconPosition,
  FillStyle,
  YAxisConfig,
  PointVisibility,
} from '@kbn/expression-xy-plugin/common';
import type {
  EventAnnotationConfig,
  EventAnnotationGroupConfig,
} from '@kbn/event-annotation-common';
import type { AxesSettingsConfig } from '@kbn/visualizations-plugin/common';

import type { CollapseFunction } from '../../../common/expressions';
import type { ValueLabelConfig } from '../../../common/types';

export const YAxisModes = {
  AUTO: 'auto',
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM: 'bottom',
} as const;

export const SeriesTypes = {
  BAR: 'bar',
  LINE: 'line',
  AREA: 'area',
  BAR_STACKED: 'bar_stacked',
  AREA_STACKED: 'area_stacked',
  BAR_HORIZONTAL: 'bar_horizontal',
  BAR_PERCENTAGE_STACKED: 'bar_percentage_stacked',
  BAR_HORIZONTAL_STACKED: 'bar_horizontal_stacked',
  AREA_PERCENTAGE_STACKED: 'area_percentage_stacked',
  BAR_HORIZONTAL_PERCENTAGE_STACKED: 'bar_horizontal_percentage_stacked',
} as const;

export const defaultSeriesType = SeriesTypes.BAR_STACKED;

export type YAxisMode = $Values<typeof YAxisModes>;
export type SeriesType = $Values<typeof SeriesTypes>;

export interface AxisConfig extends Omit<YAxisConfig, 'extent'> {
  extent?: AxisExtentConfig;
}

export interface LabelsOrientationConfig {
  x: number;
  yLeft: number;
  yRight: number;
}

export interface YConfig {
  forAccessor: string;
  color?: string;
  icon?: string;
  lineWidth?: number;
  lineStyle?: Exclude<LineStyle, 'dot-dashed'>;
  fill?: FillStyle;
  iconPosition?: IconPosition;
  textVisibility?: boolean;
  axisMode?: YAxisMode;
}

export interface XYDataLayerConfig {
  layerId: string;
  accessors: string[];
  layerType: 'data';
  seriesType: SeriesType;
  xAccessor?: string;
  simpleView?: boolean;
  yConfig?: YConfig[];
  splitAccessor?: string;
  /**
   * @deprecated use `colorMapping` config
   */
  palette?: PaletteOutput;
  collapseFn?: CollapseFunction;
  xScaleType?: XScaleType;
  isHistogram?: boolean;
  columnToLabel?: string;
  colorMapping?: ColorMapping.Config;
}

export interface XYReferenceLineLayerConfig {
  layerId: string;
  accessors: string[];
  yConfig?: YConfig[];
  layerType: 'referenceLine';
}

export interface XYByValueAnnotationLayerConfig {
  layerId: string;
  layerType: 'annotations';
  annotations: EventAnnotationConfig[];
  indexPatternId: string;
  ignoreGlobalFilters: boolean;
  // populated only when the annotation has been forked from the
  // version saved in the library (persisted as XYPersistedLinkedByValueAnnotationLayerConfig)
  cachedMetadata?: {
    title: string;
    description: string;
    tags: string[];
  };
}

export type XYByReferenceAnnotationLayerConfig = XYByValueAnnotationLayerConfig & {
  annotationGroupId: string;
  __lastSaved: EventAnnotationGroupConfig;
};

export type XYAnnotationLayerConfig =
  | XYByReferenceAnnotationLayerConfig
  | XYByValueAnnotationLayerConfig;

export type XYLayerConfig =
  | XYDataLayerConfig
  | XYReferenceLineLayerConfig
  | XYAnnotationLayerConfig;

export interface ValidXYDataLayerConfig extends XYDataLayerConfig {
  xAccessor: NonNullable<XYDataLayerConfig['xAccessor']>;
  layerId: string;
}

export type ValidLayer = ValidXYDataLayerConfig | XYReferenceLineLayerConfig;

// Persisted parts of the state
export interface XYState {
  preferredSeriesType: SeriesType;
  legend: LegendConfig;
  valueLabels?: ValueLabelConfig;
  fittingFunction?: FittingFunction;
  emphasizeFitting?: boolean;
  endValue?: EndValue;
  xExtent?: AxisExtentConfig;
  yLeftExtent?: AxisExtentConfig;
  yRightExtent?: AxisExtentConfig;
  layers: XYLayerConfig[];
  xTitle?: string;
  yTitle?: string;
  yRightTitle?: string;
  yLeftScale?: YScaleType;
  yRightScale?: YScaleType;
  axisTitlesVisibilitySettings?: AxesSettingsConfig;
  tickLabelsVisibilitySettings?: AxesSettingsConfig;
  gridlinesVisibilitySettings?: AxesSettingsConfig;
  labelsOrientation?: LabelsOrientationConfig;
  curveType?: XYCurveType;
  fillOpacity?: number;
  minBarHeight?: number;
  hideEndzones?: boolean;
  showCurrentTimeMarker?: boolean;
  pointVisibility?: PointVisibility;
}

export type State = XYState;
