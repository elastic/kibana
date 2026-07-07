/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { translations as defaultTranslations } from '../call_to_action.translations';

const cardTitle = i18n.translate('xpack.aiAssistant.callToAction.noConnectorAccess.cardTitle', {
  defaultMessage: 'No Access to Set Up Gen AI Connector',
});

const cardDescription = i18n.translate(
  'xpack.aiAssistant.callToAction.noConnectorAccess.cardDescription',
  {
    defaultMessage:
      'Looks like you don’t have the right permissions to set up a Gen AI Connector. Reach out to your admin to get access.',
  }
);

/**
 * Translations for the `NoConnectorAccess` component.
 */
export const translations = {
  description: defaultTranslations.description,
  cardTitle,
  cardDescription,
};
