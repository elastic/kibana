/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';

/**
 * Public options for {@link generateWorkflow}.
 */
export interface GenerateWorkflowOptions {
  /** Natural-language description of the workflow to generate. */
  nlQuery: string;
  /** Free-form additional context (user prompt extras). */
  additionalContext?: string;
  /** Free-form additional instructions (system prompt extras). */
  additionalInstructions?: string;
  /** Max validation-failure retries before throwing. Defaults to 3. */
  maxRetries?: number;
}

/**
 * Runtime dependencies. The caller is responsible for resolving these from the
 * Kibana plugin context.
 */
export interface GenerateWorkflowDeps {
  model: ScopedModel;
  logger: Logger;
  request: KibanaRequest;
  spaceId: string;
  /** Workflows-management API for connector and validation lookups. */
  workflowsApi: WorkflowsManagementApi;
}

export type GenerateWorkflowParams = GenerateWorkflowOptions & GenerateWorkflowDeps;

export interface GenerateWorkflowResponse {
  /** The validated, parsed workflow definition. */
  workflow: WorkflowYaml;
}

/**
 * Compact summary types surfaced in the prompt.
 */
export interface ConnectorSummary {
  id: string;
  name: string;
  actionTypeId: string;
  stepTypes: string[];
}

export interface StepDefinitionSummary {
  id: string;
  label: string;
  description?: string;
  category: string;
}

export interface TriggerDefinitionSummary {
  id: string;
  label: string;
  description?: string;
}

export interface PrefetchedContext {
  connectors: ConnectorSummary[];
  stepDefinitions: StepDefinitionSummary[];
  triggerDefinitions: TriggerDefinitionSummary[];
}

/**
 * Diagnostics returned by the validation step.
 */
export interface ValidationResult {
  valid: boolean;
  /** Filled when valid is true. */
  parsedWorkflow?: WorkflowYaml;
  /** Compact human-readable strings; empty when valid. */
  errors: string[];
}

/**
 * Discriminated union of recorded actions, kept on the graph state for
 * observability and prompt construction (similar to ESQL's `actions` array).
 */
export type Action =
  | { type: 'agent_step'; toolCalls: Array<{ name: string; args: unknown }>; text?: string }
  | { type: 'tool_result'; name: string; success: boolean; error?: string }
  | { type: 'validate'; valid: boolean; errors: string[] };
