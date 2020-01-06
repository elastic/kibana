/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternColumn } from './operations';

export interface IndexPattern {
  id: string;
  fields: IndexPatternField[];
  title: string;
  timeFieldName?: string | null;
  fieldFormatMap?: Record<
    string,
    {
      id: string;
      params: unknown;
    }
  >;
}

export type AggregationRestrictions = Record<
  string,
  {
    agg?: string;
    interval?: number;
    fixed_interval?: string;
    calendar_interval?: string;
    delay?: string;
    time_zone?: string;
  }
>;

export interface IndexPatternField {
  name: string;
  type: string;
  esTypes?: string[];
  aggregatable: boolean;
  scripted?: boolean;
  searchable: boolean;
  aggregationRestrictions?: AggregationRestrictions;
}

export interface IndexPatternLayer {
  columnOrder: string[];
  columns: Record<string, IndexPatternColumn>;
  // Each layer is tied to the index pattern that created it
  indexPatternId: string;
}

export interface IndexPatternPersistedState {
  currentIndexPatternId: string;
  layers: Record<string, IndexPatternLayer>;
}

export type IndexPatternPrivateState = IndexPatternPersistedState & {
  indexPatternRefs: IndexPatternRef[];
  indexPatterns: Record<string, IndexPattern>;

  /**
   * indexPatternId -> fieldName -> boolean
   */
  existingFields: Record<string, Record<string, boolean>>;
  showEmptyFields: boolean;
};

export interface IndexPatternRef {
  id: string;
  title: string;
}
