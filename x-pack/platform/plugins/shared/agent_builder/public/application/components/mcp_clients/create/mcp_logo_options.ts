/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export interface LogoOption {
  label: string;
  loadIconUrl: () => Promise<string>;
}

export const LOGO_OPTIONS: Readonly<Record<string, LogoOption>> = {
  claude: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.claude', {
      defaultMessage: 'Claude',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/claude.png').then(
        ({ default: url }) => url
      ),
  },
  cursor: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.cursor', {
      defaultMessage: 'Cursor',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/cursor.png').then(
        ({ default: url }) => url
      ),
  },
  openai: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.openAi', {
      defaultMessage: 'OpenAI',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/openai.png').then(
        ({ default: url }) => url
      ),
  },
  google_gemini: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.googleGemini', {
      defaultMessage: 'Google Gemini',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/google_gemini.png').then(
        ({ default: url }) => url
      ),
  },
  github_copilot: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.githubCopilot', {
      defaultMessage: 'GitHub Copilot',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/github_copilot.png').then(
        ({ default: url }) => url
      ),
  },
  azure_openai: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.azureOpenAi', {
      defaultMessage: 'Azure OpenAI',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/azure_openai.png').then(
        ({ default: url }) => url
      ),
  },
  microsoft_foundry: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.microsoftFoundry', {
      defaultMessage: 'Microsoft Foundry',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/microsoft_foundry.png').then(
        ({ default: url }) => url
      ),
  },
  amazon_kiro: {
    label: i18n.translate('xpack.agentBuilder.mcpClients.form.logoOption.amazonKiro', {
      defaultMessage: 'Amazon Kiro',
    }),
    loadIconUrl: () =>
      import(/* webpackChunkName: "mcpClientLogos" */ './assets/logos/amazon_kiro.png').then(
        ({ default: url }) => url
      ),
  },
};
