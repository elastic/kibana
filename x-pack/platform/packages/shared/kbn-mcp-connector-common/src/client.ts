/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OpenAPIV3 } from 'openapi-types';

export interface CallToolRequest {
  name: string;
  arguments?: Record<string, any>;
}

export interface TextPart {
  type: 'text';
  text: string;
}

export type ContentPart = TextPart;

export interface CallToolResponseResolved {
  content: ContentPart[];
}

export type CallToolResponse = CallToolResponseResolved;

export interface Tool {
  name: string;
  description?: string;
  inputSchema: OpenAPIV3.NonArraySchemaObject;
}

export interface ListToolsResponse {
  tools: Tool[];
}
