/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const title = i18n.translate('xpack.aiAssistant.readyToHelp.title', {
  defaultMessage: 'How can I help you?',
});

const description = i18n.translate('xpack.aiAssistant.readyToHelp.description', {
  defaultMessage: 'Ask me anything about the Elastic Stack.',
});

const securityDescription = i18n.translate('xpack.aiAssistant.readyToHelp.securityDescription', {
  defaultMessage: 'Ready to help with your Elastic Security needs.',
});

const observabilityDescription = i18n.translate(
  'xpack.aiAssistant.readyToHelp.observabilityDescription',
  {
    defaultMessage: 'Ready to help with your Elastic Observability needs.',
  }
);

const searchDescription = i18n.translate('xpack.aiAssistant.readyToHelp.searchDescription', {
  defaultMessage: 'Ready to help with your Elastic Search needs.',
});

/**
 * Translations for the `ReadyToHelp` component.
 */
export const translations = {
  title,
  description,
  securityDescription,
  observabilityDescription,
  searchDescription,
};
