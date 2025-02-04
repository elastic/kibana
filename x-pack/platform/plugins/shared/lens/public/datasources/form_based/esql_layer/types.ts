/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import { ValueFormatConfig } from '../operations/definitions/column_types';
import { TextBasedLayer, TextBasedPrivateState } from '../types';

export interface TextBasedLayerColumn {
  columnId: string;
  fieldName: string;
  label?: string;
  customLabel?: boolean;
  format?: ValueFormatConfig;
  meta?: DatatableColumn['meta'];
  inMetricDimension?: boolean;
  variable?: string;
}

export interface TextBasedField {
  id: string;
  field: string;
}

export type { TextBasedLayer, TextBasedPrivateState };

export interface IndexPatternRef {
  id: string;
  title: string;
  timeField?: string;
  name?: string;
}
