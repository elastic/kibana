/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { AlertBuilder } from './alert_builder/alert_builder';
export { formatRule } from './format_rule';
export {
  getHitsWithCount,
  getLifecycleAlertsQueries,
  getContinualAlertsQuery,
  getMaintenanceWindowAlertsQuery,
} from './get_summarized_alerts_query';
export { expandFlattenedAlert } from './format_alert';
export { sanitizeBulkErrorResponse } from './sanitize_bulk_response';
export { initializeAlertsClient } from './initialize_alerts_client';
export { isAlertImproving } from './is_alert_improving';
export { shouldCreateAlertsInAllSpaces } from './should_create_alerts_in_all_spaces';
