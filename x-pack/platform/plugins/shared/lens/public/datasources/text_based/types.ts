/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { ValueFormatConfig } from '../form_based/operations/definitions/column_types';
import type { VisualizeEditorContext } from '../../types';

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

export interface TextBasedLayer {
  index?: string;
  query?: AggregateQuery | undefined;
  table?: Datatable;
  columns: TextBasedLayerColumn[];
  timeField?: string;
  errors?: Error[];
}

export interface TextBasedPersistedState {
  layers: Record<string, TextBasedLayer>;
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
}

export type TextBasedPrivateState = TextBasedPersistedState & {
  indexPatternRefs: IndexPatternRef[];
};

export interface IndexPatternRef {
  id: string;
  title: string;
  timeField?: string;
  name?: string;
}
