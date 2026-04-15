/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { escape } from 'lodash';

import { i18n as i18nLib } from '@kbn/i18n';

/**
 * Creates a simple HTML page that acts as an interstitial while redirecting the user to another location.
 *
 * TODO: The style tag will need to be updated to support a `nonce` attribute when we start enforcing style-src CSP.
 *
 * @param heading The heading text to display on the page.
 * @param location The URL to which the user will be redirected.
 * @returns A string containing the HTML content of the redirect page.
 */
export function createRedirectHtmlPage(heading: string, location: string): string {
  return dedent`
<!DOCTYPE html>
<html lang="${i18nLib.getLocale()}">
  <head>
    <meta charSet="utf-8" />
    <meta httpEquiv="X-UA-Compatible" content="IE=edge,chrome=1" />
    <meta name="viewport" content="width=device-width" />
    <title>Elastic</title>
    <link rel="icon" type="image/svg+xml" href="/favicons/favicon.svg" />
    <link rel="alternate icon" type="image/png" href="/favicons/favicon.png" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="color-scheme" content="light dark" />
    <meta http-equiv="refresh" content="0;url=${location}" />
    <style type="text/css">
      body { opacity: 0; animation: fade-in 0.5s ease-in 2s forwards; }
      @keyframes fade-in { to { opacity: 1; } }
    </style>
  </head>
  <body>
    <h1>${escape(heading)}</h1>
    <a href="${location}">${i18nLib.translate('xpack.security.redirectPage.linkText', {
    defaultMessage: 'Click here if you are not redirected automatically',
  })}</a>
  </body>
</html>`;
}
