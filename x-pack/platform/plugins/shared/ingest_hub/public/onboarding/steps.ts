/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export interface OnboardingStepConfig {
  id: string;
  title: string;
}

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  {
    id: 'services',
    title: i18n.translate('xpack.ingestHub.onboarding.steps.services.title', {
      defaultMessage: 'Services',
    }),
  },
  {
    id: 'connect',
    title: i18n.translate('xpack.ingestHub.onboarding.steps.connect.title', {
      defaultMessage: 'Connect',
    }),
  },
  {
    id: 'name-and-scope',
    title: i18n.translate('xpack.ingestHub.onboarding.steps.nameAndScope.title', {
      defaultMessage: 'Name & Scope',
    }),
  },
  {
    id: 'deployment',
    title: i18n.translate('xpack.ingestHub.onboarding.steps.deployment.title', {
      defaultMessage: 'Deployment',
    }),
  },
  {
    id: 'see-data',
    title: i18n.translate('xpack.ingestHub.onboarding.steps.seeData.title', {
      defaultMessage: 'See Data',
    }),
  },
];
