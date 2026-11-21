/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// injectCsp() in prepare_html.ts de-dupes on an exact string match of this value.
export const CUSTOM_CONTENT_CSP_META =
  "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; form-action 'none';\">";

// Scripts, popups and forms stay off. `allow-top-navigation-by-user-activation` lets a user click
// move the top window, which is only safe because sanitizeHtml leaves nothing but links to the
// allowed apps. `allow-same-origin` lets the parent listen to clicks inside the frame (see
// interactions.ts). Without `allow-scripts` the browser itself keeps any script from running,
// whatever the content holds, and the parent is the only code that ever touches the frame's
// document. Never add `allow-scripts` next to `allow-same-origin`: together they let the content
// remove its own sandbox.
export const CUSTOM_CONTENT_IFRAME_SANDBOX =
  'allow-top-navigation-by-user-activation allow-same-origin';

export const CUSTOM_CONTENT_ALLOWED_LINK_APPS: readonly string[] = ['dashboards', 'discover'];
