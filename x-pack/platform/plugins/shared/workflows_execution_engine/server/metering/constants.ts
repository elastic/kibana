/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The metered dimension type registered with the Billing team. */
export const WORKFLOWS_USAGE_TYPE = 'workflows_execution';

/** Source ID prefix for traceability in billing logs. */
export const METERING_SOURCE_ID = 'kib-workflows-metering';

/** Duration normalization bucket size in minutes. */
export const BUCKET_SIZE_MINUTES = 5;

/** Duration normalization bucket size in milliseconds. */
export const BUCKET_SIZE_MS = BUCKET_SIZE_MINUTES * 60 * 1000;
