/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import type { ChartType } from '@kbn/visualization-utils';

export enum ToolResultType {
  resource = 'resource',
  tabularData = 'tabular_data',
  query = 'query',
  visualization = 'visualization',
  other = 'other',
  error = 'error',
}

export enum SupportedChartType {
  Metric = 'metric',
  Gauge = 'gauge',
  Tagcloud = 'tagcloud',
}

interface ToolResultMixin<TType extends ToolResultType, TData extends Object> {
  tool_result_id: string;
  type: TType;
  data: TData;
}

export type ResourceResult = ToolResultMixin<
  ToolResultType.resource,
  {
    reference: {
      id: string;
      index: string;
    };
    title?: string;
    partial?: boolean;
    content: Record<string, unknown>;
  }
>;

export type TabularDataResult = ToolResultMixin<
  ToolResultType.tabularData,
  {
    source?: 'esql';
    query: string;
    columns: EsqlEsqlColumnInfo[];
    values: FieldValue[][];
  }
>;

export type QueryResult = ToolResultMixin<ToolResultType.query, { esql: string }>;

export interface VisualizationResult {
  tool_result_id: string;
  type: ToolResultType.visualization;
  data: {
    visualization: Record<string, unknown>;
    chart_type: SupportedChartType;
    esql: string;
  };
}

export type OtherResult = ToolResultMixin<ToolResultType.other, Record<string, unknown>>;

export type ErrorResult = ToolResultMixin<
  ToolResultType.error,
  {
    message: string;
    stack?: unknown;
    metadata?: Record<string, unknown>;
  }
>;

export type ToolResult =
  | ResourceResult
  | TabularDataResult
  | QueryResult
  | VisualizationResult
  | OtherResult
  | ErrorResult;

export const isResourceResult = (result: ToolResult): result is ResourceResult => {
  return result.type === ToolResultType.resource;
};

export const isTabularDataResult = (result: ToolResult): result is TabularDataResult => {
  return result.type === ToolResultType.tabularData;
};

export const isQueryResult = (result: ToolResult): result is QueryResult => {
  return result.type === ToolResultType.query;
};

export const isOtherResult = (result: ToolResult): result is OtherResult => {
  return result.type === ToolResultType.other;
};

export const isErrorResult = (result: ToolResult): result is ErrorResult => {
  return result.type === ToolResultType.error;
};

export interface VisualizationElementAttributes {
  toolResultId?: string;
  chartType?: ChartType;
}

export const visualizationElement = {
  tagName: 'visualization',
  attributes: {
    toolResultId: 'tool-result-id',
    chartType: 'chart-type',
  },
};
