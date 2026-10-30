/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeedbackRegistryEntry } from '@kbn/ui-feedback';

export const questions: FeedbackRegistryEntry[] = [
  {
    id: 'alertzero_experience',
    order: 1,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.alertZeroExperiencePlaceholder',
      defaultMessage: 'Describe your experience',
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.alertZeroExperienceAriaLabel',
      defaultMessage: 'Describe your experience',
    },
    question: 'Describe your experience',
  },
  {
    id: 'alertzero_task_context',
    order: 2,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.alertZeroTaskContextPlaceholder',
      defaultMessage: 'What were you trying to do in AlertZero today?',
    },
    label: {
      i18nId: 'xpack.feedbackRegistry.alertZeroTaskContextLabel',
      defaultMessage: 'What were you trying to do in AlertZero today?',
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.alertZeroTaskContextAriaLabel',
      defaultMessage: 'What were you trying to do in AlertZero today?',
    },
    question: 'What were you trying to do in AlertZero today?',
  },
];
