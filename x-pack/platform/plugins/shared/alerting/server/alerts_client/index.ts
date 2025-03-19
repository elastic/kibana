/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { type LegacyAlertsClientParams, LegacyAlertsClient } from './legacy_alerts_client';
export { AlertsClient } from './alerts_client';
export type { AlertRuleData } from './types';
export { sanitizeBulkErrorResponse, initializeAlertsClient } from './lib';
export { AlertsClientError } from './alerts_client_error';
