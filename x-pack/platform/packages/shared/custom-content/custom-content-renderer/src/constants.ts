/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// injectCsp() in prepare_html.ts de-dupes on an exact string match of this value.
export const CUSTOM_CONTENT_CSP_META =
  "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; form-action 'none';\">";

// Scripts, same-origin access, popups and forms stay off. The one token lets a user click move the
// top window, which is only safe because sanitizeHtml leaves nothing but links to the allowed apps.
export const CUSTOM_CONTENT_IFRAME_SANDBOX = 'allow-top-navigation-by-user-activation';

export const CUSTOM_CONTENT_ALLOWED_LINK_APPS: readonly string[] = ['dashboards', 'discover'];

// Interactions need the parent to listen to clicks inside the frame, which takes a same-origin
// frame. `allow-scripts` stays off, so the browser itself keeps any script from running, whatever
// the content holds: the parent is the only code that ever touches the frame's document.
export const CUSTOM_CONTENT_IFRAME_SANDBOX_WITH_INTERACTIONS = `${CUSTOM_CONTENT_IFRAME_SANDBOX} allow-same-origin`;
