/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeedbackRegistryEntry } from '@kbn/feedback-registry/common';
import { DEFAULT_REGISTRY_ID, feedbackRegistry } from '@kbn/feedback-registry/common';

export const getQuestions = (appId?: string): FeedbackRegistryEntry[] => {
  if (appId && feedbackRegistry.has(appId)) {
    return feedbackRegistry.get(appId) || [];
  }

  return feedbackRegistry.get(DEFAULT_REGISTRY_ID) || [];
};
