/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ready-to-render field descriptor received from the server.
 * Mirrors server/ui_schemas/types.ts FieldDescriptor.
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
  /** Condition that must be met for this field to be visible */
  condition?: FieldVisibilityCondition;
}

/**
 * Conditions controlling when a field is visible.
 * All specified conditions must be met (AND logic).
 */
export interface FieldVisibilityCondition {
  /** Show this field only when at least one layer matches one of these series types */
  seriesTypes?: string[];
  /** Show only when the X axis is time-based */
  requiresTimeAxis?: boolean;
  /** Show only when NO text-based (ES|QL) datasource is present */
  excludeTextBased?: boolean;
}
