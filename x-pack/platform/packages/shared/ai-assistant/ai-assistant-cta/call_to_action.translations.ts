/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const title = i18n.translate('xpack.aiAssistant.callToAction.titleLabel', {
  defaultMessage: 'Welcome to AI Assistant!',
});

const titleUnlock = i18n.translate('xpack.aiAssistant.callToAction.titleUnlockLabel', {
  defaultMessage: 'Unlock the AI Assistant!',
});

const description = i18n.translate('xpack.aiAssistant.callToAction.description', {
  defaultMessage:
    "First things first, we'll need to set up a Generative AI Connector to get this chat experience going!",
});

/**
 * Translations for the `AssistantCallToAction` component.
 */
export const translations = {
  title,
  titleUnlock,
  description,
};
