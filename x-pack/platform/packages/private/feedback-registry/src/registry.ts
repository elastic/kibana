/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeedbackRegistryEntry } from '@kbn/ui-feedback';
import { DEFAULT_REGISTRY_ID } from './constants';
import type { FeedbackRegistry } from './types';

async function apmLoader() {
  const m = await import('./questions/apm');
  return m.questions;
}

async function infraLoader() {
  const m = await import('./questions/infra');
  return m.questions;
}

async function casesLoader() {
  const m = await import('./questions/cases');
  return m.questions;
}

async function alertZeroLoader() {
  const m = await import('./questions/alertzero');
  return m.questions;
}

const feedbackRegistry: FeedbackRegistry = new Map([
  [DEFAULT_REGISTRY_ID, () => import('./questions/default').then((m) => m.questions)],
  // Cases has no standalone chrome app of its own — its deep links are embedded in the
  // Security Solution app, the Observability app, and the Stack Management "Insights and
  // Alerting" section, so the app id seen at runtime is always `<hostAppId>:<casesDeepLinkId>`
  // (see `toNavDeepLinks` in
  // src/core/packages/chrome/browser-internal/src/services/nav_links/nav_links_service.ts).
  // Stack Management only registers a single "cases" management app (no separate
  // create/configure/templates deep links), so `management:cases` is the only variant there.
  ['management:cases', casesLoader],
  ['securitySolutionUI:cases', casesLoader],
  ['securitySolutionUI:cases_create', casesLoader],
  ['securitySolutionUI:cases_configure', casesLoader],
  ['securitySolutionUI:cases_templates', casesLoader],
  ['observability-overview:cases', casesLoader],
  ['observability-overview:cases_create', casesLoader],
  ['observability-overview:cases_configure', casesLoader],
  ['observability-overview:cases_templates', casesLoader],
  // AlertZero is its own chrome app (`alertzero`), so unlike Cases the app id is not
  // namespaced under a host app. The plain app id is what the header reports on the app root
  // route, while each deep link registers its own nav link (`alertzero:<deepLinkId>`) and is
  // therefore reported when the user is on that page. See
  // x-pack/solutions/security/plugins/alertzero/public/deep_links.ts for the deep link ids.
  ['alertzero', alertZeroLoader],
  ['alertzero:alerts', alertZeroLoader],
  ['alertzero:attacks', alertZeroLoader],
  ['alertzero:threat_hunt', alertZeroLoader],
  ['alertzero:streams', alertZeroLoader],
  ['alertzero:escalations', alertZeroLoader],
  ['alertzero:watches', alertZeroLoader],
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
  ['apm', apmLoader],
  ['apm:service-groups-list', apmLoader],
  ['apm:services', apmLoader],
  ['apm:traces', apmLoader],
  ['apm:service-map', apmLoader],
  ['apm:dependencies', apmLoader],
  ['apm:settings', apmLoader],
  ['apm:storage-explorer', apmLoader],
  ['apm:tutorial', apmLoader],
  ['metrics', infraLoader],
  ['metrics:inventory', infraLoader],
  ['metrics:hosts', infraLoader],
  ['metrics:metrics-explorer', infraLoader],
  ['metrics:settings', infraLoader],
  ['metrics:assetDetails', infraLoader],
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
