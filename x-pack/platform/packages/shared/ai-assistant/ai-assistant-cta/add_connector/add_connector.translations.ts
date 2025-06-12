/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { translations as defaultTranslations } from '../call_to_action.translations';

const addButton = i18n.translate('xpack.aiAssistant.callToAction.addConnector.addConnectorLabel', {
  defaultMessage: 'AI service provider',
});

/**
 * Translations for the `AddConnectorComponent`.
 */
export const translations = {
  addButton,
  description: defaultTranslations.description,
};
