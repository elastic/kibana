/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Serverless-only gates for PDF and PNG reports. Both default to `false`. They hide reports that
 * `xpack.reporting.export_types` has enabled, but cannot enable ones it has not.
 */
export const REPORTING_SERVERLESS_ON_DEMAND_EXPORT_ENABLED =
  'reporting.serverlessOnDemandExportEnabled';
export const REPORTING_SERVERLESS_SCHEDULED_EXPORT_ENABLED =
  'reporting.serverlessScheduledExportEnabled';
