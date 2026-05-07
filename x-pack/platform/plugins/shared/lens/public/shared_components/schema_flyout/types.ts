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
}
