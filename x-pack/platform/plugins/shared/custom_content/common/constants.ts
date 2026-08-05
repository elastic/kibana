/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CUSTOM_CONTENT_EMBEDDABLE_TYPE = 'custom_content';
export const CUSTOM_CONTENT_APP_NAME = 'Custom content';

export const CUSTOM_CONTENT_MAX_PROMPT_LENGTH = 10_000;
export const CUSTOM_CONTENT_MAX_TEMPLATE_BYTES = 500_000;
// Schema limit is larger than the generation byte cap to accommodate prepareHtml overhead
// (DOMPurify WHOLE_DOCUMENT wrappers + CSP <meta> injection) applied before persisting.
export const CUSTOM_CONTENT_MAX_TEMPLATE_SCHEMA_LENGTH = 510_000;

// injectCsp() in template_fill.ts de-dupes on an exact string match of this value.
export const CUSTOM_CONTENT_CSP_META =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\';">';

export const CUSTOM_CONTENT_ENABLED_FLAG_KEY = 'dashboard.customContent.enabled';
