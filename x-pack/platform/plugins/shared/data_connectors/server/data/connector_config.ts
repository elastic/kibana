/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ConnectorConfig {
  name: string;
  description: string;
  icon: string; // Image URL or path
  defaultFeatures: string[];
  flyoutComponentId?: string; // Identifier for the flyout component
  customFlyoutComponentId?: string; // Identifier for custom flyout component
  saveConfig?: {
    secretsMapping?: Record<string, string>; // Maps input field names to secret field names
    config?: Record<string, any>; // Static config values
    featuresField?: string; // Field name in input data that contains features array
  };
  oauthConfig?: {
    provider: string;
    scopes: string[];
    initiatePath: string;
    fetchSecretsPath: string;
    oauthBaseUrl?: string; // OAuth service base URL
  };
}

// Hardcoded connector configuration - eventually this will come from an API
export const CONNECTOR_CONFIG: Record<string, ConnectorConfig> = {
  brave_search: {
    name: 'Brave Search',
    description: 'Connect to Brave Search API for web search capabilities.',
    icon: '/plugins/dataConnectors/assets/brave_logo.png',
    defaultFeatures: ['search_web'],
    flyoutComponentId: 'connector_flyout',
    saveConfig: {
      secretsMapping: {
        apiKey: 'api_key', // Maps input.apiKey to secrets.api_key
      },
      config: {},
      featuresField: 'features',
    },
  },
  google_drive: {
    name: 'Google Drive',
    description: 'Connect to Google Drive to search and access files using OAuth.',
    icon: '/plugins/dataConnectors/assets/google_drive_logo.png',
    defaultFeatures: ['search_files'],
    customFlyoutComponentId: 'google_drive_connector_flyout',
    saveConfig: {
      secretsMapping: {},
      config: {},
      featuresField: 'features',
    },
    oauthConfig: {
      provider: 'google',
      scopes: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
      ],
      initiatePath: '/oauth/start/google',
      fetchSecretsPath: '/oauth/fetch_request_secrets',
      oauthBaseUrl: 'https://localhost:8052',
    },
  },
  slack: {
    name: 'Slack',
    description: 'Connect to Slack to search messages, channels, and files.',
    icon: '/plugins/dataConnectors/assets/slack_logo.png',
    defaultFeatures: ['search_messages', 'search_channels'],
    flyoutComponentId: 'connector_flyout',
    saveConfig: {
      secretsMapping: {
        apiKey: 'api_key',
      },
      config: {},
      featuresField: 'features',
    },
  },
};

