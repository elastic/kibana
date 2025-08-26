/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChartType } from '@kbn/visualization-utils';
import { randomInt } from 'crypto';

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

interface ToolResultUI {
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
    esqlQuery: string;
    esqlResult: {
      columns: EsqlEsqlColumnInfo[];
      values: FieldValue[][];
    };
  };
  ui?: ToolResultUI;
}

export interface QueryResult {
  type: ToolResultType.query;
  data: { dsl: SearchRequest } | { esql: string };
}

export interface OtherResult {
  type: ToolResultType.other;
  data: Record<string, unknown>;
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

export function getTabularDataToolResultUI() {
  const toolResultId = getToolResultId();
  return {
    toolResultId,
    description:
      'The result of executing the ESQL query can be visualized. Multiple chart types are available',
    params: {
      chartType: {
        description: `Select the visualization type most suitable for representing the esql result. Choose based on the data structure and the insights you want to highlight.`,
        type: 'string',
        default: ChartType.Line,
        options: Object.values(ChartType),
        required: false,
      },
    },
    example: `<toolresult result-id="${toolResultId}" chart-type="bar" />`,
  };
}

const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export function getToolResultId(len = 4): string {
  return Array.from({ length: len }, () => charset[randomInt(charset.length)]).join('');
}
