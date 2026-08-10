/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CUSTOM_CONTENT_GENERATE_ROUTE = '/internal/custom_content/generate';
export const CUSTOM_CONTENT_APP_NAME = 'Custom content';

export const CUSTOM_CONTENT_MAX_TEMPLATE_BYTES = 500_000;
export const CUSTOM_CONTENT_SAMPLE_ROW_COUNT = 3;

// injectCsp() in prepare_html.ts de-dupes on an exact string match of this value.
export const CUSTOM_CONTENT_CSP_META =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\';">';

export const CUSTOM_CONTENT_ENABLED_FLAG_KEY = 'dashboard.customContent.enabled';

export const CUSTOM_CONTENT_REFINE_SESSION_TAG = 'custom_content';

export const CUSTOM_CONTENT_SCRIPT_PATTERN = /<script[\s>/]/i;
