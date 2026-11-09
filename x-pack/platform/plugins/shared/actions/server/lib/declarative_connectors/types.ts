/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionScope, AuthTypeDef, ConnectorMetadata } from '@kbn/connector-specs';
import { z, lazySchema } from '@kbn/zod/v4';

export interface DeclarativeConnectorIcon {
  path: string;
  contentHash: string;
}

export type DeclarativeConnectorMetadata = Omit<ConnectorMetadata, 'id' | 'icon'> & {
  icon?: DeclarativeConnectorIcon;
};

export const declarativeFieldMetaSchema = lazySchema(() =>
  z
    .object({
      label: z.string().optional(),
      placeholder: z.string().optional(),
      helpText: z.string().optional(),
      hidden: z.boolean().optional(),
      validate: z.object({ allowedHosts: z.boolean().optional() }).strict().optional(),
    })
    .strict()
);

export type DeclarativeFieldMeta = z.infer<typeof declarativeFieldMetaSchema>;

export interface DeclarativeJsonSchema {
  type: 'object' | 'string' | 'number' | 'integer' | 'boolean' | 'array';
  properties?: Record<string, DeclarativeJsonSchema>;
  required?: string[];
  items?: DeclarativeJsonSchema;
  format?: 'uri' | 'ipv4' | 'date-time';
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: Array<string | number | boolean>;
  additionalProperties?: boolean;
  meta?: DeclarativeFieldMeta;
}

export type DeclarativeTemplateRoot = 'input' | 'config';

export type DeclarativeHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface DeclarativeRetry {
  statusCodes: number[];
  maxAttempts: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

export interface DeclarativePagination {
  strategy: 'link_header';
  header?: string;
  maxPages: number;
  itemsPath?: string;
  outputKey: string;
}

export interface DeclarativeResponseMapping {
  dataPath?: string;
  outputKey?: string;
  rateLimitHeaders?: { remaining?: string; reset?: string };
}

export interface DeclarativeRequest {
  method: DeclarativeHttpMethod;
  url?: string;
  baseUrl?: string;
  path?: string;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
  bodyType?: 'json' | 'form' | 'text';
  retry?: DeclarativeRetry;
  pagination?: DeclarativePagination;
  response?: DeclarativeResponseMapping;
}

export interface DeclarativeAction {
  description?: string;
  isTool?: boolean;
  scope?: ActionScope;
  input: DeclarativeJsonSchema;
  request: DeclarativeRequest;
}

export interface DeclarativeConnectorSpec {
  schemaVersion: 1;
  id: string;
  version: string;
  metadata: DeclarativeConnectorMetadata;
  config: DeclarativeJsonSchema;
  auth: { types: AuthTypeDef[] };
  actions: Record<string, DeclarativeAction>;
  test: { description?: string; request: DeclarativeRequest };
}

/** Thrown by the declarative connector parser. One message, no cause chain. */
export class DeclarativeConnectorSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeclarativeConnectorSpecError';
  }
}
