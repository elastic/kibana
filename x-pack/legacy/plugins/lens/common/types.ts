/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type DataType = 'string' | 'number' | 'date' | 'boolean';

export type MissingFields = { type: 'all' } | { type: 'some'; fieldNames: string[] };

export interface DateRange {
  fromDate: string;
  toDate: string;
}

export interface AggRestriction {
  agg: string;
  interval?: number;
  fixed_interval?: string;
  calendar_interval?: string;
  delay?: string;
  time_zone?: string;
}

export interface IndexPatternField {
  name: string;
  type: DataType;
  esTypes?: string[];
  aggregatable: boolean;
  searchable: boolean;
  aggregationRestrictions?: Partial<Record<string, AggRestriction>>;
  exists?: boolean;
}

export interface TypeMeta {
  aggs: Record<string, Record<string, AggRestriction>>;
}

export interface IndexPattern {
  id: string;
  title: string;
  timeFieldName?: string;
  fields: IndexPatternField[];
  typeMeta: TypeMeta;
  fieldFormatMap: unknown;
}
