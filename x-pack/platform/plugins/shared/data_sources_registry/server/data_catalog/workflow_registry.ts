/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowInfo, WorkflowReference } from './data_type';

/**
 * Represents a workflow definition from a registry
 */
export interface RegistryWorkflow {
  /** Unique identifier for the workflow */
  id: string;
  /** Workflow name */
  name: string;
  /** Workflow description */
  description?: string;
  /** YAML content of the workflow */
  content: string;
  /**
   * Default behavior for AB tool generation.
   * Can be overridden by WorkflowReference.shouldGenerateABTool
   */
  shouldGenerateABTool?: boolean;
}

/**
 * Interface for a workflow registry client.
 * Implementations can fetch workflows from various sources (HTTP API, local cache, etc.)
 */
export interface WorkflowRegistry {
  /**
   * Fetches a single workflow by ID
   * @param workflowId - Unique identifier of the workflow
   * @returns The workflow definition or undefined if not found
   */
  getWorkflow(workflowId: string): Promise<RegistryWorkflow | undefined>;

  /**
   * Fetches multiple workflows by their IDs
   * @param workflowIds - Array of workflow identifiers
   * @returns Array of workflow definitions (missing workflows are excluded)
   */
  getWorkflows(workflowIds: string[]): Promise<RegistryWorkflow[]>;
}

/**
 * Loads workflows from a registry and converts them to WorkflowInfo objects
 *
 * @param registry - The workflow registry client
 * @param references - Array of workflow references to load
 * @param stackConnectorId - Stack connector ID to substitute in workflow templates
 * @returns Array of WorkflowInfo objects
 */
export async function loadWorkflowsFromRegistry(
  registry: WorkflowRegistry,
  references: WorkflowReference[],
  stackConnectorId?: string
): Promise<WorkflowInfo[]> {
  const workflowIds = references.map((ref) => ref.id);
  const registryWorkflows = await registry.getWorkflows(workflowIds);

  // Create a map for quick lookup
  const workflowMap = new Map(registryWorkflows.map((wf) => [wf.id, wf]));
  const refMap = new Map(references.map((ref) => [ref.id, ref]));

  // Convert to WorkflowInfo, preserving order and handling missing workflows
  const workflowInfos: WorkflowInfo[] = [];
  for (const workflowId of workflowIds) {
    const registryWorkflow = workflowMap.get(workflowId);
    if (!registryWorkflow) {
      throw new Error(`Workflow '${workflowId}' not found in registry`);
    }

    const reference = refMap.get(workflowId)!;
    let content = registryWorkflow.content;

    // Replace template variables
    if (stackConnectorId) {
      content = content.replace(/\{\{stackConnectorId\}\}/g, stackConnectorId);
    }

    // Use reference override if provided, otherwise use registry default, default to true
    const shouldGenerateABTool =
      reference.shouldGenerateABTool ?? registryWorkflow.shouldGenerateABTool ?? true;

    workflowInfos.push({
      content,
      shouldGenerateABTool,
    });
  }

  return workflowInfos;
}