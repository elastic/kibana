/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeedbackRegistryEntry } from '@kbn/ui-feedback';

export const questions: FeedbackRegistryEntry[] = [
  {
    id: 'cases_experience',
    order: 1,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.casesExperiencePlaceholder',
      defaultMessage: 'Describe your experience',
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.casesExperienceAriaLabel',
      defaultMessage: 'Describe your experience',
    },
    question: 'Describe your experience',
  },
  {
    id: 'cases_task_context',
    order: 2,
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.casesTaskContextPlaceholder',
      defaultMessage: 'What were you trying to do today?',
    },
    label: {
      i18nId: 'xpack.feedbackRegistry.casesTaskContextLabel',
      defaultMessage: 'What were you trying to do today?',
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.casesTaskContextAriaLabel',
      defaultMessage: 'What were you trying to do today?',
    },
    question: 'What were you trying to do today?',
  },
];
