/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { ToolCall } from '@kbn/agent-builder-genai-utils/langchain';
import type { WorkflowYaml } from '@kbn/workflows';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';

/**
 * Public options for {@link generateWorkflow}.
 */
export interface GenerateWorkflowOptions {
  /** Natural-language description of the workflow to generate. */
  nlQuery: string;
  /** when editing an existing workflow, the workflow to edit. */
  workflow?: GenerateWorkflowEdit;
  /** Free-form additional context (user prompt extras). */
  additionalContext?: string;
  /** Free-form additional instructions (system prompt extras). */
  additionalInstructions?: string;
  /** Max validation-failure retries before throwing. Defaults to 3. */
  maxRetries?: number;
}

export interface GenerateWorkflowEdit {
  yaml: string;
  name?: string;
  id?: string;
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
  /** The natural-language text content of the LLM's final turn */
  response: string;
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
 * Recorded actions. This is the single source of truth for the graph's
 * history — the LangChain message list passed to the model is reconstructed
 * from this array on each cycle.
 *
 * Note: `AgentStepAction.toolCalls[].id` and `ToolResultAction.toolCallId`
 * are required to satisfy provider tool-call/tool-result pairing rules
 */
export interface AgentStepAction {
  type: 'agent_step';
  toolCalls: ToolCall[];
  text?: string;
}

export interface ToolResultAction {
  type: 'tool_result';
  toolCallId: string;
  name: string;
  success: boolean;
  data?: unknown;
  error?: string;
  /**
   * Present when the tool mutated the workflow YAML. Captures the post-edit
   * YAML state so the action log can be replayed and the LLM sees the
   * resulting workflow in the next turn.
   */
  currentYaml?: string;
  /**
   * Present when the tool mutated the YAML and validation was run on the
   * new state. The agent uses this to self-correct mid-loop.
   */
  validation?: {
    valid: boolean;
    errors: string[];
  };
}

export interface ValidateAction {
  type: 'validate';
  valid: boolean;
  errors: string[];
}

export type Action = AgentStepAction | ToolResultAction | ValidateAction;
