/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const PLUGIN_ID = 'reporting';

export const BROWSER_TYPE = 'chromium';

export const JOB_COMPLETION_NOTIFICATIONS_SESSION_KEY =
  'xpack.reporting.jobCompletionNotifications';

export const API_BASE_URL = '/api/reporting'; // "Generation URL" from share menu
export const API_BASE_URL_V1 = '/api/reporting/v1'; //
export const API_BASE_GENERATE_V1 = `${API_BASE_URL_V1}/generate`;
export const API_LIST_URL = '/api/reporting/jobs';
export const API_GENERATE_IMMEDIATE = `${API_BASE_URL_V1}/generate/immediate/csv/saved-object`;

export const CONTENT_TYPE_CSV = 'text/csv';
export const CSV_REPORTING_ACTION = 'downloadCsvReport';
export const CSV_BOM_CHARS = '\ufeff';
export const CSV_FORMULA_CHARS = ['=', '+', '-', '@'];

export const WHITELISTED_JOB_CONTENT_TYPES = [
  'application/json',
  'application/pdf',
  CONTENT_TYPE_CSV,
  'image/png',
  'text/plain',
];

// See:
// https://github.com/chromium/chromium/blob/3611052c055897e5ebbc5b73ea295092e0c20141/services/network/public/cpp/header_util_unittest.cc#L50
// For a list of headers that chromium doesn't like
export const KBN_SCREENSHOT_HEADER_BLACKLIST = [
  'accept-encoding',
  'connection',
  'content-length',
  'content-type',
  'host',
  'referer',
  // `Transfer-Encoding` is hop-by-hop header that is meaningful
  // only for a single transport-level connection, and shouldn't
  // be stored by caches or forwarded by proxies.
  'transfer-encoding',
  'trailer',
  'te',
  'upgrade',
  'keep-alive',
];

export const KBN_SCREENSHOT_HEADER_BLACKLIST_STARTS_WITH_PATTERN = ['proxy-'];

export const UI_SETTINGS_CUSTOM_PDF_LOGO = 'xpackReporting:customPdfLogo';

export const PDF_JOB_TYPE = 'printable_pdf';
export const PNG_JOB_TYPE = 'PNG';
export const CSV_JOB_TYPE = 'csv';
export const CSV_FROM_SAVEDOBJECT_JOB_TYPE = 'csv_from_savedobject';
export const USES_HEADLESS_JOB_TYPES = [PDF_JOB_TYPE, PNG_JOB_TYPE];

export const LICENSE_TYPE_TRIAL = 'trial';
export const LICENSE_TYPE_BASIC = 'basic';
export const LICENSE_TYPE_STANDARD = 'standard';
export const LICENSE_TYPE_GOLD = 'gold';
export const LICENSE_TYPE_PLATINUM = 'platinum';
export const LICENSE_TYPE_ENTERPRISE = 'enterprise';
