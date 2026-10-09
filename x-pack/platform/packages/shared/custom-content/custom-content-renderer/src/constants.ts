/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// injectCsp() in prepare_html.ts de-dupes on an exact string match of this value.
export const CUSTOM_CONTENT_CSP_META =
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\';">';

// Scripts, same-origin access, popups and forms stay off. The one token lets a user click move the
// top window, which is only safe because sanitizeHtml leaves nothing but internal /app/ links.
export const CUSTOM_CONTENT_IFRAME_SANDBOX = 'allow-top-navigation-by-user-activation';
