/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Saved object type id for UIAM API key provisioning status documents.
 *
 * This string intentionally matches Alerting's
 * `UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE` in
 * `x-pack/platform/plugins/shared/alerting/server/saved_objects/index.ts`. Task Manager cannot
 * import that constant
 * because `alerting` already depends on `taskManager`; importing alerting from Task Manager
 * would introduce an undesirable plugin/module dependency cycle.
 *
 * The type is registered by Alerting (`setupSavedObjects`) on `ALERTING_CASES_SAVED_OBJECT_INDEX`.
 * Task Manager only writes `entityType: 'task'` rows for observability; these writes do not
 * participate in Task Manager execution logic.
 *
 * Note: `UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE` is treated as a transitional
 * saved object type and is expected to be removed once a migration path to a longer-term
 * storage or telemetry strategy is completed.
 */
export const UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE =
  'uiam_api_keys_provisioning_status';
