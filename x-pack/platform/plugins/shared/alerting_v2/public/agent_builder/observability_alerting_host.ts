/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_APP_ID,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '@kbn/deeplinks-observability';
import { createAlertingV2HostApp, type AlertingV2HostApp } from '../locators';

/** Observability Alerting mount (`/app/observability/alerting`). */
export const OBSERVABILITY_ALERTING_HOST: AlertingV2HostApp = createAlertingV2HostApp(
  OBSERVABILITY_ALERTING_APP_ID,
  {
    rules: OBSERVABILITY_ALERTING_RULES_V2_PATH,
    ruleLibrary: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
    episodes: OBSERVABILITY_ALERTING_INBOX_PATH,
    actionPolicies: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
    executionHistory: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  }
);
