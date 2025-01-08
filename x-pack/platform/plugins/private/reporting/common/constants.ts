/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CSV_JOB_TYPE,
  CSV_JOB_TYPE_V2,
  CSV_REPORT_TYPE,
  CSV_REPORT_TYPE_V2,
} from '@kbn/reporting-export-types-csv-common';
import { PDF_JOB_TYPE_V2, PDF_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-pdf-common';
import { PNG_JOB_TYPE_V2, PNG_REPORT_TYPE_V2 } from '@kbn/reporting-export-types-png-common';

// Export Type Sets
export const reportTypes = [
  CSV_REPORT_TYPE,
  CSV_REPORT_TYPE_V2,
  PDF_REPORT_TYPE_V2,
  PNG_REPORT_TYPE_V2,
];

export const jobTypes = [CSV_JOB_TYPE, CSV_JOB_TYPE_V2, PDF_JOB_TYPE_V2, PNG_JOB_TYPE_V2];

export const USES_HEADLESS_JOB_TYPES = [PDF_JOB_TYPE_V2, PNG_JOB_TYPE_V2];

export const DEPRECATED_JOB_TYPES = ['csv']; // Replaced with csv_searchsource and csv_v2
