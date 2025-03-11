/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const panelTitle = i18n.translate(
  'xpack.aiAssistant.callToAction.installKnowledgeBase.panelTitle',
  {
    defaultMessage: 'You have not set up a Knowledge Base yet.',
  }
);

const panelDescription = i18n.translate(
  'xpack.aiAssistant.callToAction.installKnowledgeBase.panelDescription',
  {
    defaultMessage:
      'Your Generative AI Connector is setup, but you need to also set up a knowledge base to get started.',
  }
);

const installButton = i18n.translate(
  'xpack.aiAssistant.callToAction.installKnowledgeBase.installButtonLabel',
  {
    defaultMessage: 'Install Knowledge Base',
  }
);

/**
 * Translations for the `InstallKnowledgeBaseComponent`.
 */
export const translations = {
  panelTitle,
  panelDescription,
  installButton,
};
