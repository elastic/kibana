/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import type { WorkflowInfo, WorkflowReference, WorkflowsConfig } from './data_type';
import type { WorkflowRegistry } from './workflow_registry';
import { loadWorkflowsFromRegistry } from './workflow_registry';

/**
 * Loads workflow YAML files from a directory and converts them to WorkflowInfo objects.
 *
 * @param workflowsDir - Absolute path to the directory containing workflow YAML files
 * @param stackConnectorId - Stack connector ID to substitute in workflow templates
 * @returns Array of WorkflowInfo objects
 *
 * @throws Error if the directory doesn't exist or can't be read
 */
export async function loadWorkflowsFromDirectory(
  workflowsDir: string,
  stackConnectorId?: string
): Promise<WorkflowInfo[]> {
  try {
    const files = await fs.readdir(workflowsDir);

    // Filter for YAML files
    const yamlFiles = files.filter((file) => {
      const ext = extname(file);
      return ext === '.yaml' || ext === '.yml';
    });

    if (yamlFiles.length === 0) {
      throw new Error(`No YAML workflow files found in directory: ${workflowsDir}`);
    }

    // Load and process each YAML file
    const workflows = await Promise.all(
      yamlFiles.map(async (file) => {
        const filePath = join(workflowsDir, file);
        let content = await fs.readFile(filePath, 'utf-8');

        // Check if the workflow has the 'agent-builder-tool' tag
        const shouldGenerateABTool = hasAgentBuilderToolTag(content);

        // Replace template variables
        if (stackConnectorId) {
          content = content.replace(/\{\{stackConnectorId\}\}/g, stackConnectorId);
        }

        return {
          content,
          shouldGenerateABTool,
        };
      })
    );

    return workflows;
  } catch (error) {
    if (error instanceof Error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Workflows directory does not exist: ${workflowsDir}`);
      }
      throw new Error(`Failed to load workflows from ${workflowsDir}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Determines if a workflow has the 'agent-builder-tool' tag.
 * Checks for the tag in the tags array of the YAML.
 *
 * @param yamlContent - The YAML content as a string
 * @returns true if the workflow has the 'agent-builder-tool' tag
 */
function hasAgentBuilderToolTag(yamlContent: string): boolean {
  // Simple regex-based check for the tag in a tags array
  // Matches patterns like:
  //   tags: ['agent-builder-tool']
  //   tags: ["agent-builder-tool"]
  //   tags:
  //     - agent-builder-tool
  const tagPatterns = [
    /tags:\s*\[\s*['"]agent-builder-tool['"]\s*(?:,|\])/m,
    /tags:\s*\[\s*['"]agent-builder-tool['"]/m,
    /tags:\s*\n\s*-\s*['"]?agent-builder-tool['"]?/m,
  ];

  return tagPatterns.some((pattern) => pattern.test(yamlContent));
}

/**
 * Resolves the workflows directory path.
 * If workflowsDir is provided, uses it directly.
 * Otherwise, defaults to a 'workflows' directory relative to the caller's location.
 *
 * @param workflowsDir - Optional explicit workflows directory path
 * @param defaultBaseDir - Default base directory (usually __dirname of the caller)
 * @returns Resolved absolute path to workflows directory
 */
export function resolveWorkflowsDir(
  workflowsDir: string | undefined,
  defaultBaseDir: string
): string {
  if (workflowsDir) {
    return workflowsDir;
  }
  return join(defaultBaseDir, 'workflows');
}

/**
 * Loads workflows from various sources based on the configuration format.
 * Supports:
 * - String: directory path
 * - Array: workflow registry references
 * - Object: mixed (both directory and registry)
 *
 * @param workflowsConfig - Workflow configuration (string, array, or object)
 * @param registry - Optional workflow registry client (required for registry references)
 * @param stackConnectorId - Stack connector ID to substitute in workflow templates
 * @returns Array of WorkflowInfo objects
 *
 * @throws Error if configuration is invalid or registry is required but not provided
 */
export async function loadWorkflows(
  workflowsConfig: string | WorkflowReference[] | WorkflowsConfig,
  registry: WorkflowRegistry | undefined,
  stackConnectorId?: string
): Promise<WorkflowInfo[]> {
  // Case 1: String - directory path
  if (typeof workflowsConfig === 'string') {
    return loadWorkflowsFromDirectory(workflowsConfig, stackConnectorId);
  }

  // Case 2: Array - registry references
  if (Array.isArray(workflowsConfig)) {
    if (!registry) {
      throw new Error('WorkflowRegistry is required when using registry workflow references');
    }
    return loadWorkflowsFromRegistry(registry, workflowsConfig, stackConnectorId);
  }

  // Case 3: Object - mixed configuration
  const workflows: WorkflowInfo[] = [];

  // Load from directory if specified
  if (workflowsConfig.directory) {
    const directoryWorkflows = await loadWorkflowsFromDirectory(
      workflowsConfig.directory,
      stackConnectorId
    );
    workflows.push(...directoryWorkflows);
  }

  // Load from registry if specified
  if (workflowsConfig.registry && workflowsConfig.registry.length > 0) {
    if (!registry) {
      throw new Error('WorkflowRegistry is required when using registry workflow references');
    }
    const registryWorkflows = await loadWorkflowsFromRegistry(
      registry,
      workflowsConfig.registry,
      stackConnectorId
    );
    workflows.push(...registryWorkflows);
  }

  if (workflows.length === 0) {
    throw new Error('No workflows configured: specify either directory or registry');
  }

  return workflows;
}