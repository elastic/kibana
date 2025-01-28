/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import { ReportingUsageType } from './reporting_usage_collector';

/*
 * NOTE: Schema must live in standalone file for the `telemetry_check` parser.
 */
export const ReportingSchema: MakeSchemaFrom<ReportingUsageType> = {
  available: { type: 'boolean' },
  enabled: { type: 'boolean' },
};
