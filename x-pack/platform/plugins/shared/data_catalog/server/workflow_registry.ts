/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowInfo, WorkflowReference } from '../common/data_source_spec';

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
   * Fetches multiple workflows by their IDs and optional versions
   * @param workflowRefs - Array of workflow references containing id and optional version
   * @returns Array of workflow definitions (missing workflows are excluded)
   */
  getWorkflows(workflowRefs: WorkflowReference[]): Promise<Map<string, RegistryWorkflow>>;
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
  const registryWorkflows = await registry.getWorkflows(references);

  // Convert to WorkflowInfo, preserving order and handling missing workflows
  const workflowInfos: WorkflowInfo[] = [];
  for (const reference of references) {
    const registryWorkflow = registryWorkflows.get(reference.id);
    if (!registryWorkflow) {
      const versionInfo = reference.version ? ` (version: ${reference.version})` : '';
      throw new Error(`Workflow '${reference.id}'${versionInfo} not found in registry`);
    }

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
