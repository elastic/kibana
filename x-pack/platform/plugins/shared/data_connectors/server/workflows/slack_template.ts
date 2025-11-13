/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates a workflow template for Slack Search
 * @param connectorId - The ID of the workplace connector containing the API key (bearer token)
 * @param feature - Optional capability/feature (e.g., 'search_messages', 'search_channels')
 * @returns Workflow YAML template with secret reference
 */
export function createSlackWorkflowTemplate(connectorId: string, feature?: string): string {
  const workflowName = feature ? `slack.${feature}` : 'slack';
  const searchType = feature === 'search_channels' ? 'channels' : 'messages';
  const fields = feature === 'search_channels' ? 'id,name,topic,purpose' : 'text,user,ts';
  const description = feature === 'search_channels'
    ? 'Search Slack channels by name, topic, or purpose' : 'Search Slack messages';
  return `version: '1'
name: '${workflowName}'
description: '${description}'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    description: Query to search for in Slack ${searchType === 'channels' ? 'channels' : 'messages'}
    type: string
steps:
  - name: 'first-step'
    type: 'slack-search'
    with:
      bearerToken: "\${workplace_connector:${connectorId}:api_key}"
      query: "{{ inputs.query }}"
      searchType: "${searchType}"
      fields: "${fields}"
`;
}

/**
 * Get the workflow name for Slack features
 */
export function getSlackWorkflowName(feature?: string): string {
  switch (feature) {
    case 'search_messages':
      return 'Slack - Search Messages';
    case 'search_channels':
      return 'Slack - Search Channels';
    default:
      return 'Slack Search';
  }
}

/**
 * Get the workflow description for Slack features
 */
export function getSlackWorkflowDescription(feature?: string): string {
  switch (feature) {
    case 'search_messages':
      return 'Search messages in Slack using the search.messages API';
    case 'search_channels':
      return 'Search channels in Slack';
    default:
      return 'Search Slack messages and channels';
  }
}
