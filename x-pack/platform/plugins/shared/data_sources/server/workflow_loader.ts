/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { parse } from 'yaml';
import type {
  WorkflowInfo,
  WorkflowsConfig,
} from '@kbn/data-catalog-plugin/common/data_source_spec';

/**
 * Loads workflow YAML files from a directory and converts them to WorkflowInfo objects.
 *
 * @param config - Workflow configuration containing directory path and template inputs
 * @returns Array of WorkflowInfo objects
 *
 * @throws Error if the directory doesn't exist or can't be read
 */
export async function loadWorkflows(config: WorkflowsConfig): Promise<WorkflowInfo[]> {
  const { directory, templateInputs } = config;

  try {
    const files = await fs.readdir(directory);

    // Filter for YAML files
    const yamlFiles = files.filter((file) => {
      const ext = extname(file);
      return ext === '.yaml' || ext === '.yml';
    });

    if (yamlFiles.length === 0) {
      throw new Error(`No YAML workflow files found in directory: ${directory}`);
    }

    // Load and process each YAML file
    return await Promise.all(
      yamlFiles.map(async (file) => {
        const filePath = join(directory, file);
        let content = await fs.readFile(filePath, 'utf-8');

        // Replace template variables
        if (templateInputs) {
          for (const [key, value] of Object.entries(templateInputs)) {
            content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
          }
        }

        const shouldGenerateABTool = hasAgentBuilderToolTag(content);

        return {
          content,
          shouldGenerateABTool,
        };
      })
    );
  } catch (error) {
    if (error instanceof Error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Workflows directory does not exist: ${directory}`, { cause: error });
      }
      throw new Error(`Failed to load workflows from ${directory}: ${error.message}`, {
        cause: error,
      });
    }
    throw error;
  }
}

function hasAgentBuilderToolTag(yamlContent: string): boolean {
  const parsed = parse(yamlContent);
  const tags = parsed?.tags;
  return tags.length > 0 && 'agent-builder-tool' in tags;
}
