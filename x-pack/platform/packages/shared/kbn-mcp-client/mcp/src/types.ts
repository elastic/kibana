/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Details about the MCP client.
 */
export interface ClientDetails {
  name: string;
  version: string;
  url: string;
}

/**
 * Options for the MCP client.
 * These map to reconnection options for the StreamableHTTPClientTransport.
 */
export type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

export interface McpClientOptions {
  headers?: Record<string, string>;
  fetch?: FetchLike;
  maxRetries?: number;
  reconnectionDelayGrowFactor?: number;
  initialReconnectionDelay?: number;
  maxReconnectionDelay?: number;
}

/**
 * Parameters for calling a tool on the MCP client.
 */
export interface CallToolParams {
  name: string;
  arguments?: Record<string, unknown>;
}

/**
 * We reuse upstream MCP SDK types where possible to avoid drift from the MCP spec.
 */
import type {
  Annotations as SdkAnnotations,
  EmbeddedResource as SdkEmbeddedResource,
  ResourceLink as SdkResourceLink,
  TextContent as SdkTextContent,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * A resource link returned as part of a tool call response.
 * Links are references to resources that can be fetched via resources/read.
 */
export type ResourceAnnotations = SdkAnnotations;
export type ResourceLinkPart = SdkResourceLink;

/**
 * Embedded resource returned as part of a tool call response.
 * Servers may embed resource contents (text or base64 blob) inline.
 */
export type EmbeddedResourcePart = SdkEmbeddedResource;

/**
 * Non-text (or otherwise unknown) content returned as part of a tool call response.
 */
export interface NonTextPart {
  type: string;
  [key: string]: unknown;
}

/**
 * A text content as part of a tool call response.
 */
export type TextPart = SdkTextContent;

export type ContentPart = TextPart | ResourceLinkPart | EmbeddedResourcePart | NonTextPart;

/**
 * Type guard to check if a content part is a valid text part.
 * @param part - The content part to check
 */
export function isTextPart(part: ContentPart | null | undefined): part is TextPart {
  return (
    part !== null && part !== undefined && part.type === 'text' && typeof part.text === 'string'
  );
}

export function isResourceLinkPart(part: ContentPart | null | undefined): part is ResourceLinkPart {
  return (
    part !== null &&
    part !== undefined &&
    part.type === 'resource_link' &&
    typeof (part as ResourceLinkPart).uri === 'string'
  );
}

export function isEmbeddedResourcePart(
  part: ContentPart | null | undefined
): part is EmbeddedResourcePart {
  const resource = (part as EmbeddedResourcePart | null | undefined)?.resource;
  return (
    part !== null &&
    part !== undefined &&
    part.type === 'resource' &&
    typeof resource === 'object' &&
    resource !== null &&
    typeof resource.uri === 'string'
  );
}

/**
 * Response from calling a tool on the MCP client.
 */
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
   * Provider identifier (e.g., 'mcp.github')
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
   * Unique ID of the MCP connector (from config.uniqueId)
   */
  uniqueId: string;
  /**
   * Optional description of when to use this MCP server (for LLM context)
   */
  description?: string;
}

/**
 * A tool available on the MCP client.
 */
export interface Tool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  /**
   * Optional provider metadata for attribution and audit trails.
   * When present, indicates the source of the tool (e.g., which MCP connector).
   */
  provider?: ToolProviderMetadata;
}

/**
 * Response from listing the tools available on the MCP client.
 */
export interface ListToolsResponse {
  /**
   * The tools available on the MCP client.
   */
  tools: Tool[];
}
