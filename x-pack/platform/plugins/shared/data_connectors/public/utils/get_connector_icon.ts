/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maps connector names and types to their corresponding EUI icon names.
 * This is the single source of truth for connector icon mappings.
 */

// Map of connector names to icons
const CONNECTOR_NAME_TO_ICON: Record<string, string> = {
  'Google Drive': 'logoGoogleG',
  Gmail: 'email',
  Github: 'logoGithub',
  Asana: 'apps',
  Notion: 'documents',
  Slack: 'logoSlack',
  Dropbox: 'document',
  Hubspot: 'database',
  Sharepoint: 'logoBusiness',
  Airbnb: 'globe',
  Box: 'folderClosed',
  Intercom: 'discuss',
  Monday: 'calendar',
  Snowflake: 'database',
  Workday: 'users',
  Jira: 'listAdd',
  Salesforce: 'users',
};

// Map of connector types to icons
const CONNECTOR_TYPE_TO_ICON: Record<string, string> = {
  // Connector-spec IDs (from @kbn/connector-specs)
  '.notion': 'documents',
  notion: 'documents',
  '.github': 'logoGithub',
  '.slack': 'logoSlack',
  '.jira': 'listAdd',
  '.salesforce': 'users',
  '.dropbox': 'document',
  '.box': 'folderClosed',
  Jira: 'listAdd',
  Salesforce: 'users',
  'File import': 'document',
  'Web crawler': 'globe',
  Github: 'logoGithub',
  Slack: 'logoSlack',
};

/**
 * Gets the appropriate EUI icon for a connector based on its name or type.
 * First tries to match by name, then by type, then returns a default icon.
 *
 * @param connectorName - The display name of the connector (e.g., "Google Drive")
 * @param connectorType - Optional type of the connector (e.g., "File import")
 * @returns The EUI icon name to use
 */
export function getConnectorIcon(connectorName: string, connectorType?: string): string {
  // First, try to match by exact name
  if (CONNECTOR_NAME_TO_ICON[connectorName]) {
    return CONNECTOR_NAME_TO_ICON[connectorName];
  }

  // Then, try to match by type if provided
  if (connectorType && CONNECTOR_TYPE_TO_ICON[connectorType]) {
    return CONNECTOR_TYPE_TO_ICON[connectorType];
  }

  // Default fallback icon
  return 'database';
}
