/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthRequirement } from '../services/auth_service/auth_service';
import type { AuthPolicies } from '../services/auth_service/method_authorization';
import type { AlertActionsClient } from './alert_actions_client';

const manageAlerts: AuthRequirement = { feature: 'alerts', operation: 'write' };

/**
 * Feature privilege required by each public method of the alert actions client.
 * Every method mutates alert state, so all of them need "Alerts: All".
 */
export const alertActionsAuthPolicies: AuthPolicies<AlertActionsClient> = {
  createSeriesAction: manageAlerts,
  createEpisodeAction: manageAlerts,
  createBulkSeriesActions: manageAlerts,
  createBulkEpisodeActions: manageAlerts,
};
