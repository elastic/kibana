/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

/**
 * Alerts-only user: alert privileges via `stackAlertsOnly` but no rule read/create.
 * This is the persona that regressed before the `includeAlertViewableTypes` fix.
 */
export const STACK_ALERTS_READ_DASHBOARD_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['.alerts-*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: [],
      feature: { stackAlertsOnly: ['all'], dashboard: ['all'] },
      spaces: ['*'],
    },
  ],
};

/**
 * Stack rules user: full rule + alert privileges via `stackAlerts`, exercising the
 * pre-existing `rule` authorization path.
 */
export const STACK_ALERTS_ALL_DASHBOARD_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['.alerts-*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: [],
      feature: { stackAlerts: ['all'], dashboard: ['all'] },
      spaces: ['*'],
    },
  ],
};
