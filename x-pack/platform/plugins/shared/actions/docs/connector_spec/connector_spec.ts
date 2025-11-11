/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Stack Connectors 2.0 - Minimal TypeScript Specification
 * 
 * This is a simplified spec containing only features used by example connectors.
 * For the comprehensive specification, see connector_rfc.ts
 * 
 * Key principles:
 * - Single schema (config + secrets together)
 * - Secrets marked with meta.sensitive
 * - Standard auth schemas (reusable)
 * - Zod for validation and UI derivation
 */

import { z } from '@kbn/zod';
import type { Logger } from '@kbn/core/server';
import type { AxiosInstance } from 'axios';
import { i18n } from '@kbn/i18n';
import { withUIMeta, UISchemas } from './connector_spec_ui';

export { withUIMeta, UISchemas } from './connector_spec_ui';

// ============================================================================
// INTERNATIONALIZATION
// ============================================================================

export function createI18nKeys(connectorId: string) {
  const base = `xpack.stackConnectors${connectorId}`;
  return {
    metadata: (key: string) => `${base}.metadata.${key}`,
    config: (key: string) => `${base}.config.${key}`,
    secrets: (key: string) => `${base}.secrets.${key}`,
    actions: (actionName: string, key: string) => `${base}.actions.${actionName}.${key}`,
    validation: (key: string) => `${base}.validation.${key}`,
    test: (key: string) => `${base}.test.${key}`,
  };
}

// ============================================================================
// METADATA
// ============================================================================

export interface ConnectorMetadata {
  id: string;
  displayName: string;
  icon?: string;
  description: string;
  docsUrl?: string;
  minimumLicense: 'basic' | 'gold' | 'platinum' | 'enterprise';
  supportedFeatureIds: Array<
    | 'alerting'
    | 'cases'
    | 'uptime'
    | 'security'
    | 'siem'
    | 'generativeAIForSecurity'
    | 'generativeAIForObservability'
    | 'generativeAIForSearchPlayground'
    | 'endpointSecurity'
  >;
}

// ============================================================================
// STANDARD AUTH SCHEMAS
// ============================================================================

export const BasicAuthSchema = z.object({
  username: z.string().describe('Username'),
  password: withUIMeta(z.string(), { sensitive: true }).describe('Password'),
});

export const BearerAuthSchema = z.object({
  apiKey: withUIMeta(z.string(), { sensitive: true }).describe('API Key'),
});

export const OAuth2AuthSchema = z.object({
  clientId: z.string().describe('Client ID'),
  clientSecret: withUIMeta(z.string(), { sensitive: true }).describe('Client Secret'),
  tokenUrl: z.string().url().describe('Token URL'),
  scope: z.string().optional().describe('Scope'),
});

export const SSLAuthSchema = z.object({
  certificateType: z.enum(['crt', 'pfx']).describe('Certificate Type'),
  certificate: withUIMeta(z.string(), { sensitive: true }).optional().describe('Certificate'),
  privateKey: withUIMeta(z.string(), { sensitive: true }).optional().describe('Private Key'),
  pfx: withUIMeta(z.string(), { sensitive: true }).optional().describe('PFX Bundle'),
  passphrase: withUIMeta(z.string(), { sensitive: true }).optional().describe('Passphrase'),
  ca: z.string().optional().describe('CA Certificate'),
});

export function getAuthSchema(types: Array<'basic' | 'bearer' | 'oauth2' | 'ssl'>) {
  const schemas: z.ZodRawShape = {};
  
  if (types.includes('basic')) {
    Object.assign(schemas, BasicAuthSchema.shape);
  }
  if (types.includes('bearer')) {
    Object.assign(schemas, BearerAuthSchema.shape);
  }
  if (types.includes('oauth2')) {
    Object.assign(schemas, OAuth2AuthSchema.shape);
  }
  if (types.includes('ssl')) {
    Object.assign(schemas, SSLAuthSchema.shape);
  }
  
  return schemas;
}

// ============================================================================
// POLICIES
// ============================================================================

export const RETRY_RATE_LIMIT = [429, 503] as const;
export const RETRY_SERVER_ERRORS = [500, 502, 503, 504] as const;
export const RETRY_GATEWAY_ERRORS = [502, 503, 504] as const;
export const RETRY_TIMEOUT_AND_RATE_LIMIT = [408, 429, 503] as const;

export interface RateLimitPolicy {
  strategy: 'header' | 'status_code' | 'response_body';
  codes?: number[];
  remainingHeader?: string;
  resetHeader?: string;
  bodyPath?: string;
}

export interface PaginationPolicy {
  strategy: 'cursor' | 'offset' | 'link_header' | 'none';
  parameterLocation?: 'query_params' | 'headers' | 'body';
  resultPath?: string;
  cursorParam?: string;
  cursorPath?: string;
  offsetParam?: string;
  limitParam?: string;
  linkHeaderName?: string;
  pageSizeParam?: string;
  defaultPageSize?: number;
}

export interface RetryPolicy {
  retryOnStatusCodes?: number[];
  customRetryCondition?: (error: {
    status?: number;
    message?: string;
    response?: unknown;
  }) => boolean;
  maxRetries?: number;
  backoffStrategy?: 'exponential' | 'linear' | 'fixed';
  initialDelay?: number;
}

export interface ErrorPolicy {
  classifyError?: (error: { status?: number; message?: string }) => 'user' | 'system' | 'unknown';
  userErrorCodes?: number[];
  systemErrorCodes?: number[];
}

export interface StreamingPolicy {
  enabled: boolean;
  mechanism?: 'sse' | 'chunked' | 'websocket';
  parser?: 'ndjson' | 'json' | 'text' | 'custom';
}

export interface ConnectorPolicies {
  rateLimit?: RateLimitPolicy;
  pagination?: PaginationPolicy;
  retry?: RetryPolicy;
  error?: ErrorPolicy;
  streaming?: StreamingPolicy;
}

// ============================================================================
// ACTIONS
// ============================================================================

export interface ActionDefinition<TInput = unknown, TOutput = unknown, TError = unknown> {
  isTool?: boolean;
  input: z.ZodSchema<TInput>;
  output?: z.ZodSchema<TOutput>;
  error?: z.ZodSchema<TError>;
  handler: (ctx: ActionContext, input: TInput) => Promise<TOutput>;
  description?: string;
  actionGroup?: string;
  supportsStreaming?: boolean;
}

export interface ActionContext {
  auth: { method: string; [key: string]: unknown };
  log: Logger;
  client?: AxiosInstance;
  config?: Record<string, unknown>;
  connectorUsageCollector?: unknown;
}

// ============================================================================
// TRANSFORMATIONS
// ============================================================================

export interface TemplateRendering {
  enabled: boolean;
  format?: 'mustache' | 'handlebars' | 'custom';
  escaping?: 'html' | 'json' | 'markdown' | 'none';
}

export interface Transformations {
  templates?: TemplateRendering;
  serializeRequest?: (data: unknown) => unknown;
  deserializeResponse?: (data: unknown) => unknown;
  interceptors?: {
    request?: (config: unknown) => unknown | Promise<unknown>;
    response?: (response: unknown) => unknown | Promise<unknown>;
  };
}

// ============================================================================
// TESTING
// ============================================================================

export interface ConnectorTest {
  handler: (ctx: ActionContext) => Promise<{
    ok: boolean;
    message?: string;
    [key: string]: unknown;
  }>;
  description?: string;
}

// ============================================================================
// MAIN CONNECTOR DEFINITION
// ============================================================================

export interface SingleFileConnectorDefinition {
  metadata: ConnectorMetadata;
  
  // Single unified schema for all connector fields (config + secrets)
  // Mark sensitive fields with withUIMeta({ sensitive: true })
  schema: z.ZodSchema;
  
  validateUrls?: {
    fields?: string[];
  };
  
  policies?: ConnectorPolicies;
  
  actions: Record<string, ActionDefinition>;
  
  test?: ConnectorTest;
  
  transformations?: Transformations;
}

// ============================================================================
// HELPER UTILITIES
// ============================================================================

export function requiresCredentials(auth: { method: string }): boolean {
  return auth.method !== 'none' && auth.method !== 'webhook';
}

export function supportsStreaming(connector: SingleFileConnectorDefinition): boolean {
  return connector.policies?.streaming?.enabled ?? false;
}

export function getActionNames(connector: SingleFileConnectorDefinition): string[] {
  return Object.keys(connector.actions);
}

export function isToolAction(
  connector: SingleFileConnectorDefinition,
  actionName: string
): boolean {
  return connector.actions[actionName]?.isTool ?? false;
}

