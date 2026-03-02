/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { parse } from 'yaml';
import type { OpeningAndClosingTags } from 'mustache';
import Mustache from 'mustache';
import type { WorkflowInfo, WorkflowsConfig } from './data_source_spec';

const TEMPLATE_DELIMITERS: OpeningAndClosingTags = ['<%=', '%>'];

function hasAgentBuilderToolTag(yamlContent: string): boolean {
  const parsed = parse(yamlContent);
  return parsed?.tags?.includes('agent-builder-tool') ?? false;
}

/**
 * Loads workflow YAML files from a directory and converts them to WorkflowInfo objects.
 *
 * @param config - Workflow configuration containing directory path and template inputs
 * @param stackConnectorIds - Stack connector IDs to inject into the workflows
 * @returns Array of WorkflowInfo objects
 *
 * @throws Error if the directory doesn't exist or can't be read
 */
export async function loadWorkflows(
  config: WorkflowsConfig,
  stackConnectorIds?: Record<string, string>
): Promise<WorkflowInfo[]> {
  const { directory, templateInputs } = config;

  try {
    const typedTemplateInputs = {
      ...templateInputs,
      ...stackConnectorIds,
    };

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
      yamlFiles.map(async (fileName) => {
        const filePath = join(directory, fileName);
        const rawContent = await fs.readFile(filePath, 'utf-8');
        const content = Mustache.render(
          rawContent,
          typedTemplateInputs ?? {},
          {},
          TEMPLATE_DELIMITERS
        );
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
