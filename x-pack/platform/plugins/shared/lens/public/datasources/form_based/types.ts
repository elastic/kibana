/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DragDropIdentifier } from '@kbn/dom-drag-drop';
import { AggregateQuery } from '@kbn/es-query';
import { Datatable } from '@kbn/expressions-plugin/common';
import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { IndexPatternRef, TextBasedLayerColumn } from './esql_layer/types';
import type { IndexPattern, IndexPatternField, DragDropOperation } from '../../types';
import type { IncompleteColumn, GenericIndexPatternColumn } from './operations';
import { VisualizeEditorContext } from '../../types';
import { ValueFormatConfig } from './operations/definitions/column_types';

export type {
  GenericIndexPatternColumn,
  OperationType,
  IncompleteColumn,
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
  StaticValueIndexPatternColumn,
  TimeScaleIndexPatternColumn,
} from './operations';

export type { FormulaPublicApi } from './operations/definitions/formula/formula_public_api';

export type DraggedField = DragDropIdentifier & {
  field: IndexPatternField;
  indexPatternId: string;
};

export interface TextBasedLayer {
  type: 'esql';
  index?: string;
  indexPatternId?: string;
  query?: AggregateQuery | undefined;
  table?: Datatable;
  columns: TextBasedLayerColumn[];
  timeField?: string;
  params?: {
    format?: ValueFormatConfig;
  };
  errors?: Error[];
}

export interface FormBasedLayer {
  type?: 'form';
  columnOrder: string[];
  columns: Record<string, GenericIndexPatternColumn>;
  // Each layer is tied to the index pattern that created it
  indexPatternId: string;
  linkToLayers?: string[];
  // Partial columns represent the temporary invalid states
  incompleteColumns?: Record<string, IncompleteColumn | undefined>;
  sampling?: number;
  ignoreGlobalFilters?: boolean;
}

export interface FormBasedPersistedState {
  layers: Record<string, Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer>;
}

export type PersistedIndexPatternLayer = Omit<FormBasedLayer, 'indexPatternId'>;

export interface FormBasedPrivateState {
  currentIndexPatternId?: string;
  indexPatternRefs?: IndexPatternRef[];
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  layers: Record<string, FormBasedLayer | TextBasedLayer>;
}

export function isTextBasedLayer(layer: FormBasedLayer | TextBasedLayer): layer is TextBasedLayer {
  return layer.type === 'esql';
}

export function isFormBasedLayer(layer: FormBasedLayer | TextBasedLayer): layer is FormBasedLayer {
  return layer.type === 'form' || !layer.type;
}

export function isPersistedFormBasedLayer(
  layer: Omit<FormBasedLayer, 'indexPatternId'> | TextBasedLayer
): layer is Omit<FormBasedLayer, 'indexPatternId'> {
  return layer.type === 'form' || !layer.type;
}

export function hasTextBasedLayers(state: FormBasedPrivateState) {
  return Object.values(state.layers).some(isTextBasedLayer);
}

export interface PureFormBasedPrivateState {
  currentIndexPatternId?: string;
  indexPatternRefs?: IndexPatternRef[];
  layers: Record<string, FormBasedLayer>;
}

export interface TextBasedPrivateState {
  indexPatternRefs?: IndexPatternRef[];
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
  layers: Record<string, TextBasedLayer>;
}

export function hasOnlyTextBasedLayers(
  state: FormBasedPrivateState
): state is TextBasedPrivateState {
  return Object.values(state.layers).every(isTextBasedLayer);
}

export function hasOnlyFormBasedLayers(
  state: FormBasedPrivateState
): state is PureFormBasedPrivateState {
  return Object.values(state.layers).every(isFormBasedLayer);
}

export interface DataViewDragDropOperation extends DragDropOperation {
  dataView: IndexPattern;
  column?: GenericIndexPatternColumn;
}
