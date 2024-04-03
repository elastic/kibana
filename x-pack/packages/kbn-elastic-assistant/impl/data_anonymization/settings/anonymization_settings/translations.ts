/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CALLOUT_PARAGRAPH1 = i18n.translate(
  'xpack.elasticAssistant.dataAnonymization.settings.anonymizationSettings.calloutParagraph1',
  {
    defaultMessage: 'The fields below are allowed by default',
  }
);

export const CALLOUT_PARAGRAPH2 = i18n.translate(
  'xpack.elasticAssistant.dataAnonymization.settings.anonymizationSettings.calloutParagraph2',
  {
    defaultMessage: 'Optionally enable anonymization for these fields',
  }
);

export const CALLOUT_TITLE = i18n.translate(
  'xpack.elasticAssistant.dataAnonymization.settings.anonymizationSettings.calloutTitle',
  {
    defaultMessage: 'Anonymization defaults',
  }
);

export const SETTINGS_TITLE = i18n.translate(
  'xpack.elasticAssistant.dataAnonymization.settings.anonymizationSettings.settingsTitle',
  {
    defaultMessage: 'Anonymization',
  }
);
export const SETTINGS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.dataAnonymization.settings.anonymizationSettings.settingsDescription',
  {
    defaultMessage:
      "When adding Prompt Context throughout the Security App that may contain sensitive information, you can choose which fields are sent, and whether to enable anonymization for these fields. This will replace the field's value with a random string before sending the conversation. Helpful defaults are provided below.",
  }
);
