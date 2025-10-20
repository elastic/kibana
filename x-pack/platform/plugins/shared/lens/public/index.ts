/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LensPlugin } from './plugin';

export { isLensApi } from './react_embeddable/type_guards';
export { type EmbeddableComponent } from './react_embeddable/renderer/lens_custom_renderer_component';
export type {
  LensApi,
  LensSerializedState,
  LensRuntimeState,
  LensByValueInput,
  LensByReferenceInput,
  TypedLensByValueInput,
  LensEmbeddableInput,
  LensEmbeddableOutput,
  LensSavedObjectAttributes,
  LensRendererProps as EmbeddableComponentProps,
} from '@kbn/lens-common';

export type {
  XYState,
  XYReferenceLineLayerConfig,
  XYLayerConfig,
  ValidLayer,
  XYDataLayerConfig,
  XYAnnotationLayerConfig,
  YAxisMode,
  SeriesType,
  YConfig,
} from './visualizations/xy/types';
export type {
  DatasourcePublicAPI,
  DataType,
  OperationMetadata,
  SuggestionRequest,
  TableSuggestion,
  Visualization,
  VisualizationSuggestion,
  Suggestion,
  UserMessage,
} from '@kbn/lens-common';
export type {
  LegacyMetricState as MetricState,
  ValueLabelConfig,
  LensPartitionVisualizationState,
  LensPartitionLayerState,
  SharedPartitionLayerState as SharedLensPartitionLayerState,
  LensLayerType as LayerType,
} from '@kbn/lens-common';

export type { DatatableVisualizationState } from '@kbn/lens-common';
export type { HeatmapVisualizationState } from '@kbn/lens-common';
export type { GaugeVisualizationState } from '@kbn/lens-common';
export type { MetricVisualizationState } from '@kbn/lens-common';
export type { LensTagcloudState as TagcloudState } from '@kbn/lens-common';
export type {
  FormBasedPersistedState,
  PersistedIndexPatternLayer,
  OperationType,
  IncompleteColumn,
  GenericIndexPatternColumn,
  FieldBasedIndexPatternColumn,
  FiltersIndexPatternColumn,
  RangeIndexPatternColumn,
  TermsIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  MinIndexPatternColumn,
  MaxIndexPatternColumn,
  AvgIndexPatternColumn,
  CardinalityIndexPatternColumn,
  SumIndexPatternColumn,
  MedianIndexPatternColumn,
  StandardDeviationIndexPatternColumn,
  PercentileIndexPatternColumn,
  PercentileRanksIndexPatternColumn,
  CountIndexPatternColumn,
  LastValueIndexPatternColumn,
  CumulativeSumIndexPatternColumn,
  CounterRateIndexPatternColumn,
  DerivativeIndexPatternColumn,
  MovingAverageIndexPatternColumn,
  FormulaIndexPatternColumn,
  MathIndexPatternColumn,
  OverallSumIndexPatternColumn,
  FormulaPublicApi,
  StaticValueIndexPatternColumn,
  TimeScaleIndexPatternColumn,
  FormBasedLayer,
} from '@kbn/lens-common';
export type { TextBasedPersistedState } from '@kbn/lens-common';
export type {
  XYArgs,
  XYRender,
  LineStyle,
  FillStyle,
  YScaleType,
  XScaleType,
  AxisConfig,
  XYCurveType,
  XYChartProps,
  LegendConfig,
  IconPosition,
  DataLayerArgs,
  ValueLabelMode,
  AxisExtentMode,
  DataLayerConfig,
  FittingFunction,
  AxisExtentConfig,
  LegendConfigResult,
  AxesSettingsConfig,
  AxisExtentConfigResult,
  ReferenceLineLayerArgs,
  ReferenceLineLayerConfig,
} from '@kbn/expression-xy-plugin/common';

export type { InlineEditLensEmbeddableContext } from './trigger_actions/open_lens_config/in_app_embeddable_edit/types';

export type { ChartInfo } from './chart_info_api';

export { LENS_LAYER_TYPES as layerTypes } from '@kbn/lens-common';
export { LENS_EMBEDDABLE_TYPE } from '../common/constants';

export type { LensPublicStart, LensPublicSetup, LensSuggestionsApi } from './plugin';

export const plugin = () => new LensPlugin();
