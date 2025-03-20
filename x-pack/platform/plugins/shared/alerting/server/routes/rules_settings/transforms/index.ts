/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { transformQueryDelaySettingsToResponse } from './transform_query_delay_settings_to_response/latest';
export { transformAlertDeletionSettingsToResponse } from './transform_alert_deletion_settings_to_response/latest';
export { transformAlertDeletionSettingsRequest } from './transform_alert_deletion_settings_request/latest';

export { transformQueryDelaySettingsToResponse as transformQueryDelaySettingsToResponseV1 } from './transform_query_delay_settings_to_response/v1';
export { transformAlertDeletionSettingsToResponse as transformAlertDeletionSettingsToResponseV1 } from './transform_alert_deletion_settings_to_response/latest';
export { transformAlertDeletionSettingsRequest as transformAlertDeletionSettingsRequestV1 } from './transform_alert_deletion_settings_request/latest';
