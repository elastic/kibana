/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const labels = {
  logoTitle: i18n.translate('xpack.agentBuilder.mcpClients.logoTitle', {
    defaultMessage: 'MCP client logo',
  }),
  details: {
    clientIdLabel: i18n.translate('xpack.agentBuilder.mcpClients.details.clientIdLabel', {
      defaultMessage: 'Client ID',
    }),
    serverUrlLabel: i18n.translate('xpack.agentBuilder.mcpClients.details.serverUrlLabel', {
      defaultMessage: 'MCP server URL',
    }),
    closeButton: i18n.translate('xpack.agentBuilder.mcpClients.details.closeButton', {
      defaultMessage: 'Close',
    }),
    copyClientId: i18n.translate('xpack.agentBuilder.mcpClients.details.copyClientId', {
      defaultMessage: 'Copy Client ID',
    }),
    copyServerUrl: i18n.translate('xpack.agentBuilder.mcpClients.details.copyServerUrl', {
      defaultMessage: 'Copy MCP server URL',
    }),
    modal: {
      title: (name: string) =>
        i18n.translate('xpack.agentBuilder.mcpClients.details.modal.title', {
          defaultMessage: 'Copy server details for {name}',
          values: { name },
        }),
      description: i18n.translate('xpack.agentBuilder.mcpClients.details.modal.description', {
        defaultMessage:
          'Copy the new Client ID and the Server URL into the application config file, and save your changes. To apply the new configuration, restart the application.',
      }),
      clientSecretLabel: i18n.translate(
        'xpack.agentBuilder.mcpClients.details.modal.clientSecretLabel',
        {
          defaultMessage: 'MCP client secret',
        }
      ),
      secretWarning: i18n.translate('xpack.agentBuilder.mcpClients.details.modal.secretWarning', {
        defaultMessage:
          "Here's your confidential MCP client secret. We won't show it again, make sure to copy or download it now.",
      }),
      copySecret: i18n.translate('xpack.agentBuilder.mcpClients.details.modal.copySecret', {
        defaultMessage: 'Copy client secret',
      }),
      downloadSecret: i18n.translate('xpack.agentBuilder.mcpClients.details.modal.downloadSecret', {
        defaultMessage: 'Download client secret',
      }),
      toggleSecretVisibility: i18n.translate(
        'xpack.agentBuilder.mcpClients.details.modal.toggleSecretVisibility',
        {
          defaultMessage: 'Toggle secret visibility',
        }
      ),
    },
    flyout: {
      serverDetailsHeading: i18n.translate(
        'xpack.agentBuilder.mcpClients.details.flyout.serverDetailsHeading',
        {
          defaultMessage: 'Server details',
        }
      ),
      clientSecretRequiredTitle: i18n.translate(
        'xpack.agentBuilder.mcpClients.details.flyout.clientSecretRequiredTitle',
        {
          defaultMessage: 'Client secret required',
        }
      ),
      clientSecretRequiredBody: i18n.translate(
        'xpack.agentBuilder.mcpClients.details.flyout.clientSecretRequiredBody',
        {
          defaultMessage:
            'This client was created with a client secret. The secret is required for authentication but is not shown here. Please use the copy you saved when it was created.',
        }
      ),
    },
  },
};
