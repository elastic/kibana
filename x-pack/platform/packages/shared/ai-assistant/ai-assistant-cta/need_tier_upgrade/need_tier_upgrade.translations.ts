/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { translations as defaultTranslations } from '../call_to_action.translations';

const description = i18n.translate('xpack.aiAssistant.callToAction.needTierUpgrade.description', {
  defaultMessage:
    'The Elastic AI Assistant is only available with an Enterprise license. Upgrade now to start using it!',
});

const cardTitle = i18n.translate('xpack.aiAssistant.callToAction.needTierUpgrade.cardTitle', {
  defaultMessage: 'Tier upgrade required',
});

const cardDescription = i18n.translate(
  'xpack.aiAssistant.callToAction.needTierUpgrade.cardDescription',
  {
    defaultMessage:
      'To use this feature, you’ll need to upgrade your Elastic Cloud Serverless feature tier.',
  }
);

const buttonLabel = i18n.translate('xpack.aiAssistant.callToAction.needTierUpgrade.buttonLabel', {
  defaultMessage: 'Manage subscription',
});

/**
 * Translations for the `NeedTierUpgradeComponent`.
 */
export const translations = {
  title: defaultTranslations.titleUnlock,
  description,
  cardTitle,
  cardDescription,
  buttonLabel,
};
