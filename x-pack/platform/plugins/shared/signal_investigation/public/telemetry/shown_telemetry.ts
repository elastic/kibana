/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';

export const SIGNAL_INVESTIGATION_SHOWN_EVENT = 'signal_investigation_shown' as const;

export interface SignalInvestigationShownPayload {
  app: 'alerts' | 'dashboard' | 'discover';
  surface: string;
}

let analyticsSetup: AnalyticsServiceSetup | undefined;
let analyticsStart: AnalyticsServiceStart | undefined;
const registeredSetupInstances = new WeakSet<AnalyticsServiceSetup>();

/** Stores the core analytics setup and start contracts so entry points and the lazy flyout can register and report events. */
export const setSignalInvestigationAnalytics = (
  setup: AnalyticsServiceSetup | undefined,
  start?: AnalyticsServiceStart
): void => {
  if (setup !== undefined) {
    analyticsSetup = setup;
  }
  if (start !== undefined) {
    analyticsStart = start;
  }
};

export const getSignalInvestigationAnalyticsSetup = (): AnalyticsServiceSetup | undefined =>
  analyticsSetup;

/** Registers `signal_investigation_shown` once on the given analytics setup contract. */
export const registerShownTelemetryEvent = (setup: AnalyticsServiceSetup | undefined): void => {
  if (!setup || registeredSetupInstances.has(setup)) {
    return;
  }
  registeredSetupInstances.add(setup);
  setup.registerEventType({
    eventType: SIGNAL_INVESTIGATION_SHOWN_EVENT,
    schema: {
      app: {
        type: 'keyword',
        _meta: {
          description: 'Application that made the Find related changes entry point available.',
        },
      },
      surface: {
        type: 'keyword',
        _meta: {
          description:
            'UI surface that made Find related changes available. A dashboard panel counts once per mounted instance and the Discover app menu once per Discover visit. A chart brush, a log document, an alerts-table menu opening, and an alert details view each count once. signal_investigation_opened counts every open, so opened can exceed shown for the panel menu and the Discover app menu.',
        },
      },
    },
  });
};

/** Reports `signal_investigation_shown` when an entry point becomes available. Callers decide how often a surface counts. */
export const reportSignalInvestigationShown = (
  payload: SignalInvestigationShownPayload,
  analytics: AnalyticsServiceStart | undefined = analyticsStart
): void => {
  registerShownTelemetryEvent(analyticsSetup);
  if (!analytics) {
    return;
  }
  try {
    analytics.reportEvent(SIGNAL_INVESTIGATION_SHOWN_EVENT, payload);
  } catch {
    // Telemetry errors must never break the feature.
  }
};
