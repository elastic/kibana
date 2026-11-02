/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const urlTemplatePlaceholder = '{{gquery}}';
export const urlTemplateRegex = /\{\{gquery\}\}/g;
const defaultKibanaQuery = /,query:\(language:kuery,query:'.*?'\)/g;
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/**
 * Checks whether a given string is a url template. This is the
 * case if it contains the placeholder `{{gquery}}`
 * @param url The url to check
 */
export function isUrlTemplateValid(url: string) {
  // with window.location.origin we can also handle also relative paths correctly
  const parsedUrl = URL.parse(url, window.location.origin);
  if (!parsedUrl) return false;
  return ALLOWED_PROTOCOLS.includes(parsedUrl.protocol) && url.includes(urlTemplatePlaceholder);
}

/**
 * Checks whether a given string is a url that can be can be
 * turned into an url template by calling `replaceKibanaUrlParam`.
 * This is the case if a rison encoded `query` param exists
 * (this is the case e.g. for discover, dashboard and visualize URLs)
 * @param url The url to check
 */
export function isKibanaUrl(url: string) {
  return url.search(defaultKibanaQuery) > -1;
}

/**
 * Replaces the current query with an url template placeholder.
 * This will only have an effect if `isKibanaUrl` returns `true`
 * on the given `url`
 * @param url The url to turn into an url template
 */
export function replaceKibanaUrlParam(url: string) {
  return url.replace(
    defaultKibanaQuery,
    `,query:(language:kuery,query:{{${urlTemplatePlaceholder}}})`
  );
}
