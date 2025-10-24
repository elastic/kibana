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

export interface CallToolResponse {
  content: ContentPart[];
  /**
   * Optional provider metadata for attribution and audit trails.
   * Included in tool execution results for tracking and logging.
   */
  provider?: ToolProviderMetadata;
}

/**
 * Metadata about the provider of a tool.
 * Used for attribution, audit trails, and UI display.
 */
export interface ToolProviderMetadata {
  /**
   * Provider identifier (e.g., 'mcp.github-connector')
   */
  id: string;
  /**
   * Human-readable provider name (e.g., 'GitHub MCP Server')
   */
  name: string;
  /**
   * Provider type constant
   */
  type: 'mcp';
  /**
   * ID of the connector providing this tool
   */
  connectorId: string;
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema: OpenAPIV3.NonArraySchemaObject;
  /**
   * Optional provider metadata for attribution and audit trails.
   * When present, indicates the source of the tool (e.g., which MCP connector).
   */
  provider?: ToolProviderMetadata;
}

export interface ListToolsResponse {
  tools: Tool[];
}
