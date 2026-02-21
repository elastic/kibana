/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { declareServices } from '@kbn/core-di';
import { EmbeddableFactoryRegistration } from '@kbn/embeddable-factory-types';
import { LensPlugin, getLensEmbeddableServicesGetter } from './plugin';
import { LENS_EMBEDDABLE_TYPE } from '../common/constants';

// Embeddable types
export { isLensApi } from './react_embeddable/type_guards';
export { type EmbeddableComponent } from './react_embeddable/renderer/lens_custom_renderer_component';
export type {
  LensSerializedState,
  LensRuntimeState,
  LensByValueInput,
  LensByReferenceInput,
  TypedLensByValueInput,
  LensEmbeddableInput,
  LensSavedObjectAttributes,
  LensRendererProps as EmbeddableComponentProps,
} from '@kbn/lens-common';
export type { LensApi, LensEmbeddableOutput } from '@kbn/lens-common-2';

// Datasource and User message types
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
  TextBasedPersistedState,
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

// Chart types
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
  LegacyMetricState as MetricState,
  ValueLabelConfig,
  LensPartitionVisualizationState as PieVisualizationState,
  LensPartitionLayerState,
  SharedPartitionLayerState as SharedLensPartitionLayerState,
  LensLayerType as LayerType,
  DatatableVisualizationState,
  HeatmapVisualizationState,
  GaugeVisualizationState,
  MetricVisualizationState,
  LensTagCloudState as TagcloudState,
} from '@kbn/lens-common';

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

export {
  EditorFrameServiceProvider,
  useEditorFrameService,
} from './editor_frame_service/editor_frame_service_context';
export type { EditorFrameServiceProviderProps } from './editor_frame_service/editor_frame_service_context';

export type { LensPublicStart, LensPublicSetup, LensSuggestionsApi } from './plugin';

export const plugin = () => new LensPlugin();

/**
 * Registers the Lens embeddable factory globally.
 *
 * The `getFactory` callback defers to `getStartServicesForEmbeddable`,
 * which is set during `setup()` and resolves at render time when all
 * start services are available.
 */
export const services = declareServices(({ publish }) => {
  publish(EmbeddableFactoryRegistration).toConstantValue({
    type: LENS_EMBEDDABLE_TYPE,
    getFactory: async () => {
      const getter = getLensEmbeddableServicesGetter();
      if (!getter) {
        throw new Error('Lens embeddable services getter not initialized');
      }
      const [deps, { createLensEmbeddableFactory }] = await Promise.all([
        getter(),
        import('./async_services'),
      ]);
      return createLensEmbeddableFactory(deps);
    },
  });
});
