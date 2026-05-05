/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeedbackRegistryEntry } from '@kbn/feedback-components';
import { DEFAULT_REGISTRY_ID } from './constants';
import type { FeedbackRegistry } from './types';

const feedbackRegistry: FeedbackRegistry = new Map([
  [DEFAULT_REGISTRY_ID, () => import('./questions/default').then((m) => m.questions)],
  [
    'ml:anomalyExplorer',
    () => import('./questions/machine_learning').then((m) => m.anomalyExplorerQuestions),
  ],
  [
    'ml:resultExplorer',
    () => import('./questions/machine_learning').then((m) => m.dfaResultsExplorerQuestions),
  ],
  [
    'ml:analyticsMap',
    () => import('./questions/machine_learning').then((m) => m.analyticsMapQuestions),
  ],
  [
    'ml:singleMetricViewer',
    () => import('./questions/machine_learning').then((m) => m.singleMetricViewerQuestions),
  ],
]);

export const getFeedbackQuestionsForApp = async (
  appId?: string
): Promise<FeedbackRegistryEntry[]> => {
  const loader =
    appId && feedbackRegistry.has(appId)
      ? feedbackRegistry.get(appId)!
      : feedbackRegistry.get(DEFAULT_REGISTRY_ID)!;
  const questions = await loader();
  return questions.sort((a, b) => a.order - b.order);
};
