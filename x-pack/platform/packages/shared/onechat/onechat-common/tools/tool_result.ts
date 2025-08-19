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

interface ToolResultTypeBase {
  type: ToolResultType;
  data: Record<string, unknown>;
  ui?: {
    toolResultId: string;
    description: string;
    params: {
      [key: string]: {
        description: string;
        type: string;
        default: unknown;
        options?: unknown[];
        required?: boolean;
      };
    };
    example: string;
  };
}

export interface ResourceResult extends ToolResultTypeBase {
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

export interface TabularDataResult extends ToolResultTypeBase {
  type: ToolResultType.tabularData;
  data: {
    esqlQuery: string;
    esqlResult: {
      columns: EsqlEsqlColumnInfo[];
      values: FieldValue[][];
    };
  };
}

export interface QueryResult extends ToolResultTypeBase {
  type: ToolResultType.query;
  data: { dsl: SearchRequest } | { esql: string };
}

export interface OtherResult extends ToolResultTypeBase {
  type: ToolResultType.other;
  data: Record<string, unknown>;
}

export interface ErrorResult extends ToolResultTypeBase {
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
