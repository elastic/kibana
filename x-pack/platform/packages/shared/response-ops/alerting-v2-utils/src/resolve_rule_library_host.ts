/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_ALERTING_APP_ID } from '@kbn/deeplinks-observability';

/**
 * In-app path for the Observability-mounted Alerting v2 rule library.
 * Keep in sync with `OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH` in
 * `@kbn/observability-alerting-plugin`.
 */
export const OBSERVABILITY_RULE_LIBRARY_PATH = '/rule-library';

export interface AlertingV2LocatorHost {
  app: string;
  pathPrefix: string;
}

export const OBSERVABILITY_RULE_LIBRARY_HOST: AlertingV2LocatorHost = {
  app: OBSERVABILITY_ALERTING_APP_ID,
  pathPrefix: OBSERVABILITY_RULE_LIBRARY_PATH,
};

export interface ObservabilityContextSignals {
  solutionNavId?: string | null;
  projectType?: string;
  spaceSolution?: string;
}

/**
 * True when the current solution nav, serverless project, or space view is Observability.
 */
export const isObservabilityContext = ({
  solutionNavId,
  projectType,
  spaceSolution,
}: ObservabilityContextSignals): boolean =>
  solutionNavId === 'oblt' || projectType === 'observability' || spaceSolution === 'oblt';

/**
 * Host for v2 rule-library locators. Observability mounts under
 * `observabilityAlerting`; every other solution falls back to Stack Management
 * (locator default) until those hosts exist.
 */
export const resolveAlertingV2RuleLibraryHost = (
  signals: ObservabilityContextSignals
): AlertingV2LocatorHost | undefined =>
  isObservabilityContext(signals) ? OBSERVABILITY_RULE_LIBRARY_HOST : undefined;
