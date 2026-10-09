/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiFlyoutProps } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';

export interface CategorizeFieldContext {
  field: DataViewField;
  dataView: DataView;
  fieldValue: string;
  originatingApp: string;
  additionalFilter?: {
    from: number;
    to: number;
    field?: { name: string; value: string };
  };
  focusTrapProps?: EuiFlyoutProps['focusTrapProps'];
  onFilter?: (field: DataViewField, value: string, mode: '+' | '-') => void;
  projectRouting?: string;
}

export const ACTION_CATEGORIZE_FIELD = 'ACTION_CATEGORIZE_FIELD';

export type ReverseCategorizeOpenInNewTab = (params: {
  query?: Query | AggregateQuery;
  filters?: Filter[];
  /** Data view to use for a classic (non ES|QL) query */
  dataViewId?: string;
  timeRange?: TimeRange;
  tabLabel?: string;
}) => Promise<void>;

export interface ReverseCategorizeFieldContext {
  field: DataViewField;
  dataView: DataView;
  fieldValue: string;
  originatingApp: string;
  /** Opens a query, with optional filters, in a new Discover tab, if supported. */
  openInNewTab?: ReverseCategorizeOpenInNewTab;
  projectRouting?: string;
}

export const ACTION_REVERSE_CATEGORIZE_FIELD = 'ACTION_REVERSE_CATEGORIZE_FIELD';
