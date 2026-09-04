/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CASES_WORKFLOW_EXECUTION_SOURCE = 'cases' as const;
export const CASES_WORKFLOW_EXECUTION_METADATA_SCHEMA_VERSION = 1 as const;
export const MAX_CASE_WORKFLOW_RUN_ID_LENGTH = 1024 as const;
export const MAX_CASES_PER_WORKFLOW_RUN = 10 as const;
export const MAX_WORKFLOW_INPUT_KEY_LENGTH = 1024 as const;
export const MAX_WORKFLOW_INPUTS_BYTES = 1_000_000 as const;

export const CASE_WORKFLOW_ORIGIN_TYPE = 'cases.case' as const;
export const OBSERVABLE_WORKFLOW_ORIGIN_TYPE = 'cases.observable' as const;
export const ALERT_WORKFLOW_ORIGIN_TYPE = 'cases.alert' as const;
export const ALERTS_WORKFLOW_ORIGIN_TYPE = 'cases.alerts' as const;
