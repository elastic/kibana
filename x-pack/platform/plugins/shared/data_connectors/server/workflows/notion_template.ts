/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates a workflow template for Notion
 * @param connectorId - The ID of the workplace connector containing the API key
 * @param feature - Optional capability/feature (e.g., 'search_web')
 * @returns Workflow YAML template with secret reference
 */
export function createNotionSearchWorkflowTemplate(connectorId: string, feature?: string): string {
  const workflowName = feature ? `notion_search.${feature}` : 'notion_search';
  return `version: '1'
name: '${workflowName}'
description: 'Search using Notion Search API'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
    description: The query to search for
steps:
  - name: search-notion
    type: console
    with:
      message: Notion API call
`;
}
