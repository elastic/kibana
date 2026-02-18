/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';
import type { DataSource } from '@kbn/data-catalog-plugin';
import { loadWorkflows } from '@kbn/data-catalog-plugin/common/workflow_loader';
import { parse } from 'yaml';

interface WorkflowSummary {
  name: string;
  description: string;
  inputs: Array<{ name: string; type: string; required: boolean; description: string }>;
}

interface RawWorkflowYaml {
  name?: string;
  description?: string;
  tags?: string[];
  inputs?: Array<{
    name: string;
    type?: string;
    required?: boolean;
    description?: string;
  }>;
}

function parseWorkflowSummary(yamlContent: string): WorkflowSummary | undefined {
  try {
    const parsed: RawWorkflowYaml = parse(yamlContent);
    if (!parsed?.tags?.includes('agent-builder-tool')) {
      return undefined;
    }
    return {
      name: parsed.name ?? 'unknown',
      description:
        typeof parsed.description === 'string' ? parsed.description : 'No description available',
      inputs: (parsed.inputs ?? []).map((input) => ({
        name: input.name,
        type: input.type ?? 'string',
        required: input.required ?? false,
        description: input.description ?? '',
      })),
    };
  } catch {
    return undefined;
  }
}

function formatWorkflowTools(workflows: WorkflowSummary[]): string {
  if (workflows.length === 0) {
    return 'No workflow tools available for this data source.';
  }

  return workflows
    .map((wf) => {
      const baseName = wf.name.split('.').pop() || wf.name;
      const inputList = wf.inputs
        .map(
          (input) =>
            `  - \`${input.name}\` (${input.type}${input.required ? ', required' : ''}): ${
              input.description
            }`
        )
        .join('\n');
      return `- **${baseName}**: ${wf.description}${inputList ? `\n${inputList}` : ''}`;
    })
    .join('\n');
}

function formatImportedTools(dataSource: DataSource): string {
  const tools = dataSource.stackConnectors.flatMap((sc) => sc.importedTools ?? []);
  if (tools.length === 0) {
    return '';
  }

  const toolList = tools
    .map((tool) => `- **${tool.name}**${tool.description ? `: ${tool.description}` : ''}`)
    .join('\n');

  return `### Imported Tools\n${toolList}`;
}

function buildToolReferenceSection(
  dataSource: DataSource,
  workflowSummaries: WorkflowSummary[]
): string {
  const sections = [
    `## Available Tools`,
    '',
    `When the ${dataSource.name} data source is connected, the following tools become available:`,
    '',
    `### Workflow Tools`,
    formatWorkflowTools(workflowSummaries),
  ];

  const importedToolsSection = formatImportedTools(dataSource);
  if (importedToolsSection) {
    sections.push('', importedToolsSection);
  }

  sections.push(
    '',
    `## Connectivity`,
    '',
    `Before using any ${dataSource.name} tools, check if the data source is connected by using the \`data-sources.${dataSource.id}.check-status\` tool. If not connected, guide the user to the Data Sources page to set up a connection.`
  );

  return sections.join('\n');
}

/**
 * Reads the handwritten SKILL.md for a data source type.
 * Returns the raw markdown content, or a minimal fallback if no SKILL.md exists.
 */
export async function readSkillMarkdown(dataSource: DataSource): Promise<string> {
  const skillsDir = resolve(dataSource.workflows.directory, '../skills');
  const skillPath = resolve(skillsDir, 'SKILL.md');
  try {
    return (await fs.readFile(skillPath, 'utf-8')).trimEnd();
  } catch {
    return [
      `# ${dataSource.name} Data Source`,
      '',
      dataSource.description ?? `Connect to ${dataSource.name}.`,
    ].join('\n');
  }
}

/**
 * Reads the handwritten CATALOG.md for a data source type.
 * Returns a brief description of what the data source covers (for semantic matching
 * in the catalog skill), or a minimal fallback if no CATALOG.md exists.
 */
export async function readCatalogMarkdown(dataSource: DataSource): Promise<string> {
  const skillsDir = resolve(dataSource.workflows.directory, '../skills');
  const catalogPath = resolve(skillsDir, 'CATALOG.md');
  try {
    return (await fs.readFile(catalogPath, 'utf-8')).trimEnd();
  } catch {
    return dataSource.description ?? `Connect to ${dataSource.name}.`;
  }
}

/**
 * Reads the handwritten SKILL.md for a data source from its skills/ directory
 * (located alongside its workflows/ directory), then appends a deterministic
 * "Available Tools" section generated from the workflow YAML definitions and
 * imported MCP tools.
 */
export async function generateSkillContent(dataSource: DataSource): Promise<string> {
  // Read the handwritten skill markdown from the source's skills/ directory
  const skillsDir = resolve(dataSource.workflows.directory, '../skills');
  const skillPath = resolve(skillsDir, 'SKILL.md');
  let handwrittenContent: string;
  try {
    handwrittenContent = await fs.readFile(skillPath, 'utf-8');
  } catch {
    // Fall back to a minimal description if no SKILL.md exists
    handwrittenContent = [
      `# ${dataSource.name} Data Source`,
      '',
      dataSource.description ?? `Connect to ${dataSource.name}.`,
    ].join('\n');
  }

  // Parse workflows to build the deterministic tool reference
  let workflowSummaries: WorkflowSummary[] = [];
  try {
    const workflowInfos = await loadWorkflows(dataSource.workflows, {});
    workflowSummaries = workflowInfos
      .map((wf) => parseWorkflowSummary(wf.content))
      .filter((summary): summary is WorkflowSummary => summary !== undefined);
  } catch {
    // Workflows may fail to load at setup time (template placeholders not filled),
    // so we gracefully degrade to showing no workflow details.
  }

  const toolReference = buildToolReferenceSection(dataSource, workflowSummaries);

  return `${handwrittenContent.trimEnd()}\n\n${toolReference}`;
}
