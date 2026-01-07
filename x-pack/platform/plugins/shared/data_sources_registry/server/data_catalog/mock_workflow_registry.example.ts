/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowRegistry, RegistryWorkflow } from './workflow_registry';

/**
 * EXAMPLE: Mock Workflow Registry Implementation
 *
 * This is an example implementation of the WorkflowRegistry interface.
 * Use this as a reference when implementing your own registry client.
 */

/**
 * In-memory workflow registry for testing and development.
 * In production, this would fetch workflows from an external API or database.
 */
export class MockWorkflowRegistry implements WorkflowRegistry {
  private workflows = new Map<string, RegistryWorkflow>();

  constructor(workflows?: RegistryWorkflow[]) {
    if (workflows) {
      workflows.forEach((wf) => this.workflows.set(wf.id, wf));
    }
  }

  /**
   * Add a workflow to the registry
   */
  addWorkflow(workflow: RegistryWorkflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Fetch a single workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<RegistryWorkflow | undefined> {
    return this.workflows.get(workflowId);
  }

  /**
   * Fetch multiple workflows by their IDs
   */
  async getWorkflows(workflowIds: string[]): Promise<RegistryWorkflow[]> {
    const results: RegistryWorkflow[] = [];
    for (const id of workflowIds) {
      const workflow = this.workflows.get(id);
      if (workflow) {
        results.push(workflow);
      }
    }
    return results;
  }
}

/**
 * HTTP-based workflow registry that fetches from a remote API.
 * This is closer to a real-world implementation.
 */
export class HttpWorkflowRegistry implements WorkflowRegistry {
  constructor(private readonly baseUrl: string) {}

  async getWorkflow(workflowId: string): Promise<RegistryWorkflow | undefined> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/${workflowId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return undefined;
        }
        throw new Error(`Failed to fetch workflow: ${response.statusText}`);
      }

      const data = await response.json();
      return this.mapToRegistryWorkflow(data);
    } catch (error) {
      console.error(`Error fetching workflow ${workflowId}:`, error);
      return undefined;
    }
  }

  async getWorkflows(workflowIds: string[]): Promise<RegistryWorkflow[]> {
    try {
      // Batch API request for efficiency
      const response = await fetch(`${this.baseUrl}/workflows/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: workflowIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch workflows: ${response.statusText}`);
      }

      const data = await response.json();
      return data.workflows.map((wf: any) => this.mapToRegistryWorkflow(wf));
    } catch (error) {
      console.error('Error fetching workflows:', error);
      // Fall back to individual requests
      return this.getWorkflowsIndividually(workflowIds);
    }
  }

  private async getWorkflowsIndividually(workflowIds: string[]): Promise<RegistryWorkflow[]> {
    const promises = workflowIds.map((id) => this.getWorkflow(id));
    const results = await Promise.all(promises);
    return results.filter((wf): wf is RegistryWorkflow => wf !== undefined);
  }

  private mapToRegistryWorkflow(data: any): RegistryWorkflow {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      content: data.yaml || data.content,
      shouldGenerateABTool: data.generateTool ?? data.shouldGenerateABTool ?? true,
    };
  }
}

/**
 * Example usage in tests
 */
export function createTestRegistry(): MockWorkflowRegistry {
  const registry = new MockWorkflowRegistry();

  // Add some test workflows
  registry.addWorkflow({
    id: 'common-search-v1',
    name: 'Common Search Workflow',
    description: 'Generic search workflow that works across data sources',
    content: `version: '1'
name: 'common.search'
description: 'Generic search operation'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
  - name: limit
    type: number
    default: 10
steps:
  - name: search
    type: connector.search
    connector-id: {{stackConnectorId}}
    with:
      query: "\${{inputs.query}}"
      limit: "\${{inputs.limit}}"`,
    shouldGenerateABTool: true,
  });

  registry.addWorkflow({
    id: 'common-analytics-v1',
    name: 'Common Analytics Workflow',
    description: 'Generic analytics workflow',
    content: `version: '1'
name: 'common.analytics'
description: 'Analytics operation'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: metric
    type: string
  - name: timeRange
    type: object
steps:
  - name: analyze
    type: connector.analytics
    connector-id: {{stackConnectorId}}
    with:
      metric: "\${{inputs.metric}}"
      timeRange: "\${{inputs.timeRange}}"`,
    shouldGenerateABTool: true,
  });

  registry.addWorkflow({
    id: 'github-search-issues-v1',
    name: 'GitHub Search Issues',
    description: 'Search for issues in a GitHub repository',
    content: `version: '1'
name: 'sources.github.search_issues'
description: 'Search for issues in a GitHub repository'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: owner
    type: string
  - name: repo
    type: string
  - name: query
    type: string
    required: false
steps:
  - name: search-issues
    type: github.searchIssues
    connector-id: {{stackConnectorId}}
    with:
      owner: "\${{inputs.owner}}"
      repo: "\${{inputs.repo}}"
      query: "\${{inputs.query}}"`,
    shouldGenerateABTool: true,
  });

  return registry;
}

/**
 * Example usage with HTTP registry
 */
export function createHttpRegistry(baseUrl: string = 'https://workflows.elastic.co/api'): HttpWorkflowRegistry {
  return new HttpWorkflowRegistry(baseUrl);
}