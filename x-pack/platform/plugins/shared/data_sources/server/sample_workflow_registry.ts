/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sample Workflow Registry Implementation
 *
 * This is a temporary sample implementation of the WorkflowRegistry interface.
 * It will be replaced with a real implementation that fetches workflows from
 * an external workflow registry service.
 */

import type { WorkflowReference } from '@kbn/data-catalog-plugin/common/data_source_spec';
import type { RegistryWorkflow, WorkflowRegistry } from './workflow_registry';

/**
 * In-memory workflow registry for development and testing.
 * In production, this will be replaced with an implementation that
 * fetches workflows from an external registry service.
 */
export class SampleWorkflowRegistry implements WorkflowRegistry {
  private workflows = new Map<string, RegistryWorkflow>();

  constructor(workflows?: RegistryWorkflow[]) {
    if (workflows) {
      workflows.forEach((wf) => this.workflows.set(wf.id, wf));
    }
  }

  /**
   * Add a workflow to the registry (for testing)
   */
  addWorkflow(workflow: RegistryWorkflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Add a versioned workflow to the registry (for testing)
   * Stores workflow with key "id@version"
   */
  addVersionedWorkflow(workflow: RegistryWorkflow, version: string): void {
    this.workflows.set(`${workflow.id}@${version}`, workflow);
  }

  /**
   * Fetch multiple workflows by their IDs and optional versions
   */
  async getWorkflows(workflowRefs: WorkflowReference[]): Promise<Map<string, RegistryWorkflow>> {
    const results = new Map<string, RegistryWorkflow>();

    for (const ref of workflowRefs) {
      // Try versioned key first if version is specified, then fall back to unversioned
      const versionedKey = ref.version ? `${ref.id}@${ref.version}` : null;
      const workflow = versionedKey
        ? this.workflows.get(versionedKey) ?? this.workflows.get(ref.id)
        : this.workflows.get(ref.id);

      if (workflow) {
        results.set(ref.id, workflow);
      }
    }

    return results;
  }
}

/**
 * Creates a sample workflow registry pre-populated with common test workflows.
 * This is used during development until a real registry service is available.
 */
export function createSampleWorkflowRegistry(): SampleWorkflowRegistry {
  const registry = new SampleWorkflowRegistry();

  // Add some common test workflows
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

  // Add a legacy version of common-analytics for version testing
  registry.addVersionedWorkflow(
    {
      id: 'common-analytics-v1',
      name: 'Common Analytics Workflow (Legacy)',
      description: 'Legacy analytics workflow',
      content: `version: 'legacy'
name: 'common.analytics.legacy'
description: 'Legacy analytics operation'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: metric
    type: string
steps:
  - name: analyze
    type: connector.analytics.legacy
    connector-id: {{stackConnectorId}}
    with:
      metric: "\${{inputs.metric}}"`,
      shouldGenerateABTool: true,
    },
    'legacy'
  );

  return registry;
}
