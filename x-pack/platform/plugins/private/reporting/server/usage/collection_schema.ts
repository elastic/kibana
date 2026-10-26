/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { ReportingUsageType } from './reporting_usage_collector';

/*
 * NOTE: Schema must live in standalone file for the `telemetry_check` parser.
 */
export const ReportingSchema: MakeSchemaFrom<ReportingUsageType> = {
  has_errors: { type: 'boolean' },
  error_messages: { type: 'array', items: { type: 'text' } },
  available: { type: 'boolean' },
  enabled: { type: 'boolean' },
  number_of_scheduled_reports: { type: 'long' },
  number_of_enabled_scheduled_reports: { type: 'long' },
  number_of_scheduled_reports_by_type: {
    csv_searchsource: { type: 'long' },
    csv_v2: { type: 'long' },
    printable_pdf_v2: { type: 'long' },
    printable_pdf: { type: 'long' },
    PNGV2: { type: 'long' },
  },
  number_of_enabled_scheduled_reports_by_type: {
    csv_searchsource: { type: 'long' },
    csv_v2: { type: 'long' },
    printable_pdf_v2: { type: 'long' },
    printable_pdf: { type: 'long' },
    PNGV2: { type: 'long' },
  },
  number_of_scheduled_reports_with_notifications: { type: 'long' },
};
