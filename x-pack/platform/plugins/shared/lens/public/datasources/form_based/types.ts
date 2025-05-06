/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DragDropIdentifier } from '@kbn/dom-drag-drop';
import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { AggregateQuery } from '@kbn/es-query';
import { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type {
  IndexPattern,
  IndexPatternField,
  DragDropOperation,
  VisualizeEditorContext,
} from '../../types';
import type { IncompleteColumn, GenericIndexPatternColumn } from './operations';
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

export interface TextBasedLayer {
  type: 'esql';
  index?: string;
  indexPatternId?: string;
  query?: AggregateQuery | undefined;
  table?: Datatable;
  columns: TextBasedLayerColumn[];
  timeField?: string;
  errors?: Error[];
}

export type PersistedIndexPatternLayer = Omit<FormBasedLayer, 'indexPatternId'>;

export interface FormBasedPersistedState {
  layers: Record<string, PersistedIndexPatternLayer>;
}

export interface TextBasedPersistedState {
  layers: Record<string, TextBasedLayer>;
  // is initialContext ever persisted ?
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
}

export interface CombinedFormBasedPersistedState {
  layers: Record<string, PersistedIndexPatternLayer | TextBasedLayer>;
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
}

export function isTextBasedLayer(layer: FormBasedLayer | TextBasedLayer): layer is TextBasedLayer {
  return layer.type === 'esql';
}
export function isFormBasedLayer(layer: FormBasedLayer | TextBasedLayer): layer is FormBasedLayer {
  return !layer.type || layer.type === 'form';
}

export function isPersistedFormBasedLayer(
  layer: PersistedIndexPatternLayer | TextBasedLayer
): layer is PersistedIndexPatternLayer {
  return !layer.type || layer.type === 'form';
}
export function isPersistedTextBasedLayer(
  layer: PersistedIndexPatternLayer | TextBasedLayer
): layer is TextBasedLayer {
  return layer.type === 'esql';
}

export function isTextBasedPersistedState(
  state: FormBasedPersistedState | TextBasedPersistedState
): state is TextBasedPersistedState {
  return Object.values(state.layers).some((layer) => isTextBasedLayer(layer));
}
export function isFormBasedPersistedState(
  state: FormBasedPersistedState | TextBasedPersistedState
): state is FormBasedPersistedState {
  return Object.values(state.layers).some((layer) => isFormBasedLayer(layer));
}

export interface FormBasedPrivateState {
  currentIndexPatternId: string;
  layers: Record<string, FormBasedLayer>;
}

export type TextBasedPrivateState = TextBasedPersistedState & {
  indexPatternRefs: IndexPatternRef[];
};

export interface CombinedFormBasedPrivateState {
  currentIndexPatternId: string;
  layers: Record<string, FormBasedLayer | TextBasedLayer>;
  indexPatternRefs: IndexPatternRef[];
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
}

export interface DataViewDragDropOperation extends DragDropOperation {
  dataView: IndexPattern;
  column?: GenericIndexPatternColumn;
}

export interface TextBasedLayerColumn {
  columnId: string;
  fieldName: string;
  label?: string;
  customLabel?: boolean;
  params?: {
    format?: ValueFormatConfig;
  };
  meta?: DatatableColumn['meta'];
  inMetricDimension?: boolean;
  variable?: string;
}

export interface TextBasedField {
  id: string;
  field: string;
}

export interface IndexPatternRef {
  id: string;
  title: string;
  timeField?: string;
  name?: string;
}
