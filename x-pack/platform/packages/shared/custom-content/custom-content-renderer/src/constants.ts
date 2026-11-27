/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// injectCsp() in prepare_html.ts de-dupes on an exact string match of this value.
export const CUSTOM_CONTENT_CSP_META =
  "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; form-action 'none';\">";

// Scripts, popups and forms stay off in both. `allow-top-navigation-by-user-activation` lets a user
// click move the top window, which is only safe because sanitizeHtml leaves nothing but links to the
// allowed apps. Without `allow-scripts` the browser itself keeps any script from running, whatever the
// content holds.
export const CUSTOM_CONTENT_IFRAME_SANDBOX_TOP_NAV_ONLY = 'allow-top-navigation-by-user-activation';

// `allow-same-origin` lets the parent listen to clicks inside the frame (see interactions.ts), and it
// puts the content on Kibana's origin: only for a host that listens, never for one that does not,
// such as the chat card that shows model output. The parent is the only code that touches the frame's
// document. Never add `allow-scripts` next to `allow-same-origin`: together they let the content
// remove its own sandbox.
export const CUSTOM_CONTENT_IFRAME_SANDBOX_WITH_SAME_ORIGIN = `${CUSTOM_CONTENT_IFRAME_SANDBOX_TOP_NAV_ONLY} allow-same-origin`;

export const CUSTOM_CONTENT_ALLOWED_LINK_APPS: readonly string[] = ['dashboards', 'discover'];
