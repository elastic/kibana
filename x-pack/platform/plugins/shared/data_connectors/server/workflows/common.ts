/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Get the workflow name for a given connector type
 */
export function getWorkflowName(connectorType: string, feature?: string): string {
  switch (connectorType) {
    case 'brave_search':
      return 'Brave Search';
    case 'google_drive':
      if (feature === 'search_files') return 'Google Drive - Search Files';
      if (feature === 'download_file') return 'Google Drive - Download File';
      if (feature === 'search_documents') return 'Google Drive - Search Documents';
      return 'Google Drive';
    case 'notion_search':
      return 'Notion Search';
    default:
      return `${connectorType} Workflow`;
  }
}

/**
 * Get the workflow description for a given connector type
 */
export function getWorkflowDescription(connectorType: string, feature?: string): string {
  switch (connectorType) {
    case 'brave_search':
      return 'Search using Brave Search API with automatic secret resolution';
    case 'google_drive':
      if (feature === 'search_files')
        return 'Search for files in Google Drive using OAuth authentication';
      if (feature === 'download_file')
        return 'Download files from Google Drive with OAuth authentication';
      if (feature === 'search_documents')
        return 'Search specifically for Google Docs in Google Drive';
      return 'Federated search and access to Google Drive with automatic OAuth token management';
    case 'notion_search':
      return 'Search using Notion API with OAuth 2.0';
    default:
      return `Workflow for ${connectorType}`;
  }
}
