/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getFeedbackQuestionsForApp } from './registry';

export {
  DEFAULT_REGISTRY_ID,
  DEFAULT_EXPERIENCE_QUESTION_ID,
  DEFAULT_GENERAL_QUESTION_ID,
} from './constants';

export type { FeedbackRegistryEntry, FeedbackRegistryEntryId, FeedbackRegistry } from './types';
