/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_EXPERIENCE_QUESTION_ID,
  DEFAULT_GENERAL_QUESTION_ID,
  DEFAULT_REGISTRY_ID,
} from './constants';
import type { FeedbackRegistry, FeedbackRegistryEntry } from './types';

const feedbackRegistry: FeedbackRegistry = new Map([
  [
    DEFAULT_REGISTRY_ID,
    [
      {
        id: DEFAULT_EXPERIENCE_QUESTION_ID,
        order: 1,
        placeholder: {
          i18nId: 'xpack.feedbackRegistry.defaultExperiencePlaceholder',
          defaultMessage: 'Describe your experience',
        },
        ariaLabel: {
          i18nId: 'xpack.feedbackRegistry.defaultExperienceAriaLabel',
          defaultMessage: 'Describe your experience',
        },
        question: 'Describe your experience',
      },
      {
        id: DEFAULT_GENERAL_QUESTION_ID,
        order: 2,
        placeholder: {
          i18nId: 'xpack.feedbackRegistry.defaultGeneralPlaceholder',
          defaultMessage: 'Add more thoughts',
        },
        label: {
          i18nId: 'xpack.feedbackRegistry.defaultGeneralLabel',
          defaultMessage: 'Anything else you would like to share about Elastic overall?',
        },
        ariaLabel: {
          i18nId: 'xpack.feedbackRegistry.defaultGeneralAriaLabel',
          defaultMessage: 'Additional feedback about Elastic',
        },
        question: 'Anything else you would like to share about Elastic overall?',
      },
    ],
  ],
]);

export const getFeedbackQuestionsForApp = (appId?: string): FeedbackRegistryEntry[] => {
  if (appId && feedbackRegistry.has(appId)) {
    return feedbackRegistry.get(appId)?.sort((a, b) => a.order - b.order) || [];
  }

  return feedbackRegistry.get(DEFAULT_REGISTRY_ID)?.sort((a, b) => a.order - b.order) || [];
};
