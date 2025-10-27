/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates a workflow template for Brave Search
 * @param connectorId - The ID of the workplace connector containing the API key
 * @param feature - Optional capability/feature (e.g., 'search_web')
 * @returns Workflow YAML template with secret reference
 */
export function createBraveSearchWorkflowTemplate(connectorId: string, feature?: string): string {
  const workflowName = feature ? `brave_search.${feature}` : 'brave_search';
  return `version: '1'
name: '${workflowName}'
description: 'Search using Brave Search API'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
    description: The query to search for
steps:
  - name: 'Search Brave'
    type: 'http'
    with:
      url: "https://api.search.brave.com/res/v1/web/search?q={{ inputs.query | url_encode }}"
      method: 'GET'
      headers:
        Accept: application/json
        Accept-Encoding: gzip
        X-Subscription-Token: \${workplace_connector:${connectorId}:api_key}
`;
}

/**
 * Get the workflow name for a given connector type
 */
export function getWorkflowName(connectorType: string): string {
  switch (connectorType) {
    case 'brave_search':
      return 'Brave Search';
    default:
      return `${connectorType} Workflow`;
  }
}

/**
 * Get the workflow description for a given connector type
 */
export function getWorkflowDescription(connectorType: string): string {
  switch (connectorType) {
    case 'brave_search':
      return 'Search using Brave Search API with automatic secret resolution';
    default:
      return `Workflow for ${connectorType}`;
  }
}
