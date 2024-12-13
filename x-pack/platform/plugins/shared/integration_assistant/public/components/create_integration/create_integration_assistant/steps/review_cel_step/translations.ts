/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.integrationAssistant.step.reviewCel.title', {
  defaultMessage: 'Review results',
});
export const DESCRIPTION = i18n.translate('xpack.integrationAssistant.step.reviewCel.description', {
  defaultMessage:
    'Review the generated CEL input configuration settings for your integration. These settings will be auto-populated into the integration configuration where editing will be possible.',
});

export const PROGRAM = i18n.translate('xpack.integrationAssistant.step.reviewCel.program', {
  defaultMessage: 'The CEL program to be run for each polling',
});
export const STATE = i18n.translate('xpack.integrationAssistant.step.reviewCel.state', {
  defaultMessage: 'Initial CEL evaluation state',
});
export const REDACT_VARS = i18n.translate('xpack.integrationAssistant.step.reviewCel.redact', {
  defaultMessage: 'Redacted fields',
});

export const SAVE_BUTTON = i18n.translate('xpack.integrationAssistant.step.reviewCel.save', {
  defaultMessage: 'Save',
});
