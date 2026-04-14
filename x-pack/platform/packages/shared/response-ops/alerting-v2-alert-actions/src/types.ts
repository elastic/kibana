/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@kbn/es-mappings';
import type { z } from '@kbn/zod/v4';

/**
 * Declarative definition for an alert action type.
 *
 * Provide `id`, `bodySchema`, `description`, and optionally `esMappings` /
 * `pathSuffix`. Everything else (routes, discriminated unions, data-stream
 * mappings) is derived automatically by the framework.
 */
export interface AlertActionTypeDefinition<
  TId extends string = string,
  TBody extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>
> {
  /** Unique action type identifier (e.g., 'ack', 'tag', 'snooze'). */
  id: TId;
  /** URL path suffix for the per-action route. Defaults to `_${id}`. */
  pathSuffix?: string;
  /** Human-readable description surfaced in API docs. */
  description: string;
  /** Zod schema for action-specific body fields (must NOT include `action_type`). */
  bodySchema: TBody;
  /** ES mapping properties for action-specific fields persisted to the data stream. */
  esMappings?: Record<string, MappingProperty>;
}

/**
 * Fully resolved alert action definition returned by {@link defineAlertActionType}.
 * Includes the original definition fields plus auto-derived schemas and resolved defaults.
 */
export interface AlertActionDefinition {
  /** Unique action type identifier. */
  id: string;
  /** URL path suffix for the per-action route. */
  pathSuffix: string;
  /** Human-readable description surfaced in API docs. */
  description: string;
  /** Zod schema for action-specific body fields. */
  bodySchema: z.ZodObject<z.ZodRawShape>;
  /** ES mapping properties for action-specific fields persisted to the data stream. */
  esMappings: Record<string, MappingProperty>;
  /** Body fields + `action_type` literal, used as a discriminated union member. */
  fullSchema: z.ZodObject<z.ZodRawShape>;
  /** Body fields with `.strict()` applied, used for HTTP route validation. */
  routeBodySchema: z.ZodType<Record<string, unknown>>;
}
