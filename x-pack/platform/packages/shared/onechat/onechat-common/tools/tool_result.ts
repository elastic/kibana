/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { EsqlEsqlColumnInfo, FieldValue } from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';

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
  tool_result_id: string;
  type: ToolResultType.tabularData;
  data: {
    source?: 'esql';
    query: string;
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

export const TOOL_RESULT_SCHEMA = schema.oneOf([
  // ErrorResult
  schema.object({
    type: schema.literal(ToolResultType.error),
    data: schema.object({
      message: schema.string(),
      stack: schema.maybe(schema.object({}, {unknowns: 'allow'})),
      metadata: schema.maybe(schema.object({}, {unknowns: 'allow'}))
    })
  }),
  //OtherResult
  schema.object({
    type: schema.literal(ToolResultType.other),
    data: schema.object({}, {unknowns: 'allow'})
  }),
  //QueryResult
  schema.object({
    type: schema.literal(ToolResultType.query),
    data: schema.oneOf([
      schema.object({
        dsl: schema.object({}) // idk how to represent this
      }),
      schema.object({
        esql: schema.string()
      })
    ])
  }),
  // TabularData
  schema.object({
    tool_result_id: schema.string(),
    type: schema.literal(ToolResultType.tabularData),
    data: schema.object({
      source: schema.maybe(
        schema.literal('esql')
      ),
      query: schema.string(),
      columns: schema.arrayOf(
        schema.object({
          name: schema.string(),
          type: schema.string()
        })
      ),
      values: schema.arrayOf(schema.arrayOf(
        schema.maybe(
          schema.oneOf(
            [
              schema.boolean(),
              schema.number(),
              schema.string()
            ]
          )
        )
      ))
    })
  }),
  // ResourceResult
  schema.object({
    type: schema.literal(ToolResultType.resource),
    data: schema.object({
      reference: schema.object({
        id: schema.string(),
        index: schema.string(),
        routing: schema.maybe(schema.string())
      }),
      title: schema.maybe(schema.string()),
      partial: schema.maybe(schema.boolean()),
      content: schema.object({}, { unknowns: 'allow'})
    })
  })
])

export type ToolResult =
  | ResourceResult
  | TabularDataResult
  | QueryResult
  | OtherResult
  | ErrorResult;

export const visualizationElement = {
  tagName: 'visualization',
  attributes: {
    toolResultId: 'tool-result-id',
  },
};
