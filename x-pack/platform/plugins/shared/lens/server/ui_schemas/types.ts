/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * UI schema entry — per-field overrides provided by visualization authors.
 * Acts as an allowlist: only fields listed here appear in the response.
 */
export interface UISchemaEntry {
  /** Dot-delimited path into the Joi schema, e.g. 'styling.density.mode' */
  path: string;
  /** Human-readable label (i18n) */
  label: string;
  /** Override widget type (e.g. 'buttonGroup', 'rowHeight', 'paginationToggle') */
  widget?: string;
  /** Extra props forwarded to the widget component */
  props?: Record<string, unknown>;
  /** Tooltip text */
  tooltip?: string;
  /** Description override (replaces Joi meta description) */
  description?: string;
  /** Override option labels for enum/select fields. Keys are raw schema values, values are i18n'd labels. */
  options?: Array<{ value: string; label: string }>;
}

/**
 * Ready-to-render field descriptor returned by the server endpoint.
 * The client uses this directly — no schema processing needed.
 */
export interface FieldDescriptor {
  path: string;
  type: string;
  label: string;
  description?: string;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  required?: boolean;
  widget?: string;
  props?: Record<string, unknown>;
  tooltip?: string;
  children?: FieldDescriptor[];
}
