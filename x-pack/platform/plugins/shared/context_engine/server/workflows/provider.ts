/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

/**
 * The workflow operations Context Engine needs in order to apply an approved automation
 * improvement.
 *
 * Context Engine cannot depend on the workflows plugin directly: workflows depends on Agent Builder
 * SML, which in turn depends on Context Engine. So this is a port, and `contextEngineAgentBuilder` —
 * which already depends on both — registers the adapter over `workflowsManagement` during setup.
 */

/** Every call is scoped to a space and runs under the acting user's own privileges. */
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
  /** Only used to roll back a workflow this plugin just created. */
  delete(args: WorkflowProviderContext & { workflowId: string }): Promise<void>;
}
