/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INGEST_HUB_ENABLED_FLAG = 'ingestHub.enabled';
export const INGEST_HUB_ONBOARDING_ENABLED_FLAG = 'ingestHub.onboardingEnabled';

export const AWS_ONBOARDING_TITLE = i18n.translate('xpack.ingestHub.awsOnboardingTitle', {
  defaultMessage: 'Amazon Web Services',
});
export const AWS_ONBOARDING_DESCRIPTION = i18n.translate(
  'xpack.ingestHub.awsOnboardingDescription',
  {
    defaultMessage: 'Collect logs and metrics from Amazon Web Services (AWS).',
  }
);
