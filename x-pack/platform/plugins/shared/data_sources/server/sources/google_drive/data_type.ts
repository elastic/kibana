/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource, ConnectorReference } from '@kbn/data-catalog-plugin';
import { EARSSupportedOAuthProvider } from '@kbn/data-catalog-plugin';
import {
  generateGoogleDriveSearchFilesWorkflow,
  generateGoogleDriveListFilesWorkflow,
  generateGoogleDriveDownloadFilesWithJinaWorkflow,
  generateGoogleDriveDownloadFilesWithIngestSimulateWorkflow,
} from './workflows';

export const googleDriveDataSource: DataSource = {
  id: 'google_drive',
  name: 'Google Drive',
  description: i18n.translate('xpack.dataSources.googleDrive.description', {
    defaultMessage: 'Connect to Google Drive to access files and folders.',
  }),
  iconType: '.google_drive',

  oauthConfiguration: {
    provider: EARSSupportedOAuthProvider.GOOGLE,
    initiatePath: '/oauth/start/google_drive',
    fetchSecretsPath: '/oauth/fetch_request_secrets',
    oauthBaseUrl: 'https://localhost:8052', // update once EARS deploys to QA
  },

  stackConnectors: [
    {
      type: '.google_drive',
      config: {},
      role: 'primary',
      name: 'Google Drive',
      description: i18n.translate('xpack.dataSources.googleDrive.connectorDescription', {
        defaultMessage: 'Connect to Google Drive to search and access your files and folders.',
      }),
    },
    {
      type: '.jina',
      config: {},
      role: 'optional',
      name: 'Jina Reader',
      description: i18n.translate('xpack.dataSources.googleDrive.jinaDescription', {
        defaultMessage:
          'Enable high-quality extraction of file contents to markdown using Jina Reader. This provides better handling of complex document layouts and semantic chunking. Get a free API key at jina.ai/reader',
      }),
      skipDescription: i18n.translate('xpack.dataSources.googleDrive.jinaSkipDescription', {
        defaultMessage:
          "File content extraction will use Elasticsearch's built-in attachment processor instead. This provides basic text extraction but may not handle complex layouts as well as Jina Reader.",
      }),
    },
  ],

  generateWorkflows(connectors: ConnectorReference[]) {
    // Find connectors by type (not position) for reliable matching
    const googleDrive = connectors.find((c) => c.type === '.google_drive');
    const jina = connectors.find((c) => c.type === '.jina');

    if (!googleDrive) {
      throw new Error('Google Drive connector is required for Google Drive data source');
    }

    const workflows = [
      {
        content: generateGoogleDriveSearchFilesWorkflow(googleDrive.id),
        shouldGenerateABTool: true,
      },
      {
        content: generateGoogleDriveListFilesWorkflow(googleDrive.id),
        shouldGenerateABTool: true,
      },
    ];

    // Add download workflow - uses Jina Reader if configured for high-quality extraction,
    // otherwise falls back to Elasticsearch's ingest.simulate with attachment processor
    if (jina) {
      // Jina Reader connector was configured - use it for high-quality extraction
      workflows.push({
        content: generateGoogleDriveDownloadFilesWithJinaWorkflow(googleDrive.id, jina.id),
        shouldGenerateABTool: true,
      });
    } else {
      // No Jina Reader - use Elasticsearch's built-in attachment processor as fallback
      workflows.push({
        content: generateGoogleDriveDownloadFilesWithIngestSimulateWorkflow(googleDrive.id),
        shouldGenerateABTool: true,
      });
    }

    return workflows;
  },
};
