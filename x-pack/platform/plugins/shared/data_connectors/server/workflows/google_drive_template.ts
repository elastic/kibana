/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Creates a workflow template for Google Drive operations
 * @param connectorId - The ID of the workplace connector containing the OAuth tokens
 * @param feature - Capability/feature (e.g., 'search', 'list', 'get', 'download')
 * @returns Workflow YAML template with secret reference
 */
export function createGoogleDriveWorkflowTemplate(connectorId: string, feature?: string): string {
  const workflowName = feature ? `google_drive.${feature}` : 'google_drive';
  const description = getGoogleDriveWorkflowDescription(feature);

  switch (feature) {
    case 'search':
      return `version: '1'
name: '${workflowName}'
description: '${description}'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    description: Search query to find files in Google Drive
    type: string
steps:
  - name: 'search-files'
    type: 'gdrive'
    with:
      accessToken: "\${workplace_connector:${connectorId}:accessToken}"
      operation: "search"
      query: "{{ inputs.query }}"
`;

    case 'list':
      return `version: '1'
name: '${workflowName}'
description: '${description}'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: folderId
    description: Optional folder ID to list files from (leave empty for root)
    type: string
    required: false
steps:
  - name: 'list-files'
    type: 'gdrive'
    with:
      accessToken: "\${workplace_connector:${connectorId}:accessToken}"
      operation: "list"
      folderId: "{{ inputs.folderId }}"
`;

    case 'get':
      return `version: '1'
name: '${workflowName}'
description: '${description}'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: fileId
    description: The ID of the file to retrieve metadata for
    type: string
steps:
  - name: 'get-file'
    type: 'gdrive'
    with:
      accessToken: "\${workplace_connector:${connectorId}:accessToken}"
      operation: "get"
      fileId: "{{ inputs.fileId }}"
`;

    case 'download':
      return `version: '1'
name: '${workflowName}'
description: '${description}'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: fileId
    description: The ID of the file to download
    type: string
steps:
  - name: 'download-file'
    type: 'gdrive'
    with:
      accessToken: "\${workplace_connector:${connectorId}:accessToken}"
      operation: "download"
      fileId: "{{ inputs.fileId }}"
`;

    default:
      // Default to search for backward compatibility
      return `version: '1'
name: '${workflowName}'
description: '${description}'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    description: Search query to find files in Google Drive
    type: string
steps:
  - name: 'search-files'
    type: 'gdrive'
    with:
      accessToken: "\${workplace_connector:${connectorId}:accessToken}"
      operation: "search"
      query: "{{ inputs.query }}"
`;
  }
}

/**
 * Get the workflow name for Google Drive features
 */
export function getGoogleDriveWorkflowName(feature?: string): string {
  switch (feature) {
    case 'search':
      return 'Google Drive - Search';
    case 'list':
      return 'Google Drive - List Files';
    case 'get':
      return 'Google Drive - Get File';
    case 'download':
      return 'Google Drive - Download File';
    default:
      return 'Google Drive';
  }
}

/**
 * Get the workflow description for Google Drive features
 */
export function getGoogleDriveWorkflowDescription(feature?: string): string {
  switch (feature) {
    case 'search':
      return 'Search for files in Google Drive using full-text search';
    case 'list':
      return 'List files and folders in Google Drive';
    case 'get':
      return 'Get file metadata from Google Drive';
    case 'download':
      return 'Download file content from Google Drive';
    default:
      return 'Search and access files in Google Drive';
  }
}
