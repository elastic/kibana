/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface LogoOption {
  label: string;
  isDefault?: boolean;
  loadIconUrl: () => Promise<string>;
}

export const LOGO_OPTIONS: Readonly<Record<string, LogoOption>> = {
  mcp_client: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.mcpClient', {
      defaultMessage: 'MCP client logo',
    }),
    isDefault: true,
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/mcp_client.png').then(
        ({ default: url }) => url
      ),
  },
  claude_desktop: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.claudeDesktop', {
      defaultMessage: 'Claude desktop',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/claude_desktop.png').then(
        ({ default: url }) => url
      ),
  },
  openai: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.openAi', {
      defaultMessage: 'Open AI',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/openai.png').then(
        ({ default: url }) => url
      ),
  },
  azure_openai: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.azureOpenAi', {
      defaultMessage: 'Azure Open AI',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/azure_openai.png').then(
        ({ default: url }) => url
      ),
  },
  google_ai_studio: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.googleAiStudio', {
      defaultMessage: 'Google AI Studio',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/google_ai_studio.png').then(
        ({ default: url }) => url
      ),
  },
  azure_ai_studio: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.azureAiStudio', {
      defaultMessage: 'Azure AI studio',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/azure_ai_studio.png').then(
        ({ default: url }) => url
      ),
  },
};
