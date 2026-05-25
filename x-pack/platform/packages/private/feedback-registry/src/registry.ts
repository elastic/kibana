/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeedbackRegistryEntry } from '@kbn/feedback-components';
import { DEFAULT_REGISTRY_ID } from './constants';
import type { FeedbackRegistry } from './types';

/**
 * Apps listed here will not have their category prefix in the satisfaction question.
 * e.g. Questions for "metrics:inventory" will ask users about "Infrastructure inventory" instead of "Observability - Infrastructure inventory"
 */
export const APPS_WITHOUT_CATEGORY_PREFIX = [
  'ml:singleMetricViewer',
  'ml:resultExplorer',
  'ml:analyticsMap',
  'ml:anomalyExplorer',
  'apm',
  'apm:service-groups-list',
  'apm:services',
  'apm:traces',
  'apm:service-map',
  'apm:dependencies',
  'apm:settings',
  'apm:storage-explorer',
  'apm:tutorial',
  'metrics',
  'metrics:inventory',
  'metrics:hosts',
  'metrics:metrics-explorer',
  'metrics:settings',
  'metrics:assetDetails',
];

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
  ['apm', () => import('./questions/apm').then((m) => m.questions)],
  ['apm:service-groups-list', () => import('./questions/apm').then((m) => m.questions)],
  ['apm:services', () => import('./questions/apm').then((m) => m.questions)],
  ['apm:traces', () => import('./questions/apm').then((m) => m.questions)],
  ['apm:service-map', () => import('./questions/apm').then((m) => m.questions)],
  ['apm:dependencies', () => import('./questions/apm').then((m) => m.questions)],
  ['apm:settings', () => import('./questions/apm').then((m) => m.questions)],
  ['apm:storage-explorer', () => import('./questions/apm').then((m) => m.questions)],
  ['apm:tutorial', () => import('./questions/apm').then((m) => m.questions)],
  ['metrics', () => import('./questions/infra').then((m) => m.questions)],
  ['metrics:inventory', () => import('./questions/infra').then((m) => m.questions)],
  ['metrics:hosts', () => import('./questions/infra').then((m) => m.questions)],
  ['metrics:metrics-explorer', () => import('./questions/infra').then((m) => m.questions)],
  ['metrics:settings', () => import('./questions/infra').then((m) => m.questions)],
  ['metrics:assetDetails', () => import('./questions/infra').then((m) => m.questions)],
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
