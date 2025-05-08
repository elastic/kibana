/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const cardTitle = i18n.translate('xpack.aiAssistant.callToAction.installKnowledgeBase.cardTitle', {
  defaultMessage: 'Set up a Knowledge Base.',
});

const cardDescription = i18n.translate(
  'xpack.aiAssistant.callToAction.installKnowledgeBase.cardDescription',
  {
    defaultMessage:
      "Your Generative AI Connector is ready. Now you just need to set up a Knowledge Base and you'll be all set to use AI Assistant.",
  }
);

const installButton = i18n.translate(
  'xpack.aiAssistant.callToAction.installKnowledgeBase.installButtonLabel',
  {
    defaultMessage: 'Install Knowledge Base',
  }
);

const installingButton = i18n.translate(
  'xpack.aiAssistant.callToAction.installKnowledgeBase.installingButtonLabel',
  {
    defaultMessage: 'Installing Knowledge Base',
  }
);

const unavailableTooltip = i18n.translate(
  'xpack.aiAssistant.callToAction.installKnowledgeBase.installingButtonUnavailablToolTip',
  {
    defaultMessage: 'Knowledge Base unavailable, check the documentation for more details.',
  }
);

/**
 * Translations for the `InstallKnowledgeBaseComponent`.
 */
export const translations = {
  cardTitle,
  cardDescription,
  installButton,
  installingButton,
  unavailableTooltip,
};
