/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// injectCsp() in prepare_html.ts de-dupes on an exact string match of this value.
export const CUSTOM_CONTENT_CSP_META =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\';">';
