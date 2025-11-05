/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


/**
 * Creates a workflow template for Google Drive Search
 * @param connectorId - The ID of the workplace connector containing the request_id
 * @param feature - Optional capability/feature (e.g., 'search_files', 'search_documents')
 * @returns Workflow YAML template with secret reference
 */
export function createGoogleDriveWorkflowTemplate(connectorId: string, feature?: string): string {

  const workflowName = feature ? `google_drive.${feature}` : 'google_drive';
  return `version: '1'
name: '${workflowName}'
description: 'Search your Google Drive'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
    description: The query to search for
steps:
  - name: 'Search Files'
    type: 'http'
    with:
      url: "https://www.googleapis.com/drive/v3/files?q=fullText%20contains%20%22{{ inputs.query }}%22"
      method: 'GET'
      headers:
        Accept: application/json
        Authorization: "Bearer \${workplace_connector:${connectorId}:access_token}"
  - name: 'Download File'
    type: 'http'
    with:
      url: "https://www.googleapis.com/drive/v3/files/{{ steps['Search Files'].output.data.files[0].id }}/export?mimeType=text/plain"
      method: 'GET'
      headers:
        Authorization: "Bearer \${workplace_connector:${connectorId}:access_token}"
`;
}


/**
 * Get the workflow name for Google Drive features
 */
export function getGoogleDriveWorkflowName(feature?: string): string {
  switch (feature) {
    case 'search_files':
      return 'Google Drive - Search Files';
    case 'download_file':
      return 'Google Drive - Download File';
    case 'search_documents':
      return 'Google Drive - Search Documents';
    default:
      return 'Google Drive';
  }
}

/**
 * Get the workflow description for Google Drive features
 */
export function getGoogleDriveWorkflowDescription(feature?: string): string {
  switch (feature) {
    case 'search_files':
      return 'Search for files and folders in Google Drive using OAuth authentication';
    case 'download_file':
      return 'Download files from Google Drive with OAuth authentication';
    case 'search_documents':
      return 'Search specifically for Google Docs in Google Drive';
    default:
      return 'Federated search and access to Google Drive with automatic OAuth token management';
  }
}

