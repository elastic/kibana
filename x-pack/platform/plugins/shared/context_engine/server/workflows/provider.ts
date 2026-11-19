/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

/** Space and user request a workflow operation runs under. */
export interface WorkflowProviderContext {
  spaceId: string;
  request: KibanaRequest;
}

export interface WorkflowSummary {
  id: string;
  /** Managed workflows are owned by a plugin and only accept enable/disable changes. */
  managed: boolean;
  enabled: boolean;
}

export interface WorkflowValidationResult {
  valid: boolean;
  /** Human-readable diagnostics, empty when `valid`. */
  errors: string[];
}

/** Workflow operations Context Engine uses to apply automation improvements. */
export interface WorkflowProvider {
  validate(args: WorkflowProviderContext & { yaml: string }): Promise<WorkflowValidationResult>;
  /** Resolves `null` when the workflow does not exist in the space. */
  get(args: WorkflowProviderContext & { workflowId: string }): Promise<WorkflowSummary | null>;
  /** Resolves the id of the created workflow. */
  create(args: WorkflowProviderContext & { yaml: string }): Promise<string>;
  update(args: WorkflowProviderContext & { workflowId: string; yaml: string }): Promise<void>;
  setEnabled(
    args: WorkflowProviderContext & { workflowId: string; enabled: boolean }
  ): Promise<void>;
  delete(args: WorkflowProviderContext & { workflowId: string }): Promise<void>;
}
