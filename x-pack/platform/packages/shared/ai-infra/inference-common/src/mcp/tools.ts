/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  ListToolsResponse,
  CallToolRequest,
  CallToolResponse,
} from '@kbn/mcp-connector-common';

export interface InferenceMCPConnector {
  connectorId: string;
}

export interface InferenceListToolsResponse {
  servers: Array<{ connectorId: string; tools: ListToolsResponse['tools'] }>;
}

export interface InferenceCallToolRequest extends CallToolRequest {
  connectorId: string;
}

export interface InferenceCallToolResponse extends CallToolResponse {
  connectorId: string;
}
