/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SearchRequest,
  EsqlEsqlColumnInfo,
  FieldValue,
} from '@elastic/elasticsearch/lib/api/types';

export enum ToolResultType {
  resource = 'resource',
  tabularData = 'tabular_data',
  query = 'query',
  other = 'other',
  error = 'error',
}

export interface ResourceResult {
  type: ToolResultType.resource;
  data: {
    reference: {
      id: string;
      index: string;
      routing?: string;
    };
    title?: string;
    partial?: boolean;
    content: Record<string, unknown>;
  };
}

export interface TabularDataResult {
  type: ToolResultType.tabularData;
  data: {
    columns: EsqlEsqlColumnInfo[];
    values: FieldValue[][];
  };
}

export interface QueryResult {
  type: ToolResultType.query;
  data: { dsl: SearchRequest } | { esql: string };
}

export interface OtherResult {
  type: ToolResultType.other;
  data: unknown;
}

export interface ErrorResult {
  type: ToolResultType.error;
  data: {
    message: string;
    stack?: unknown;
    metadata?: Record<string, unknown>;
  };
}

export type ToolResult =
  | ResourceResult
  | TabularDataResult
  | QueryResult
  | OtherResult
  | ErrorResult;
