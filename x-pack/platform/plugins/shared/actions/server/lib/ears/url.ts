/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Resolves the full EARS URL by combining the configured base URL with the URL path.
 * If no base URL is configured, it throws an error.
 */
export function resolveEarsUrl(urlPath: string, earsBaseUrl: string | undefined): string {
  if (!earsBaseUrl) {
    throw new Error('EARS base URL is not configured');
  }

  const base = earsBaseUrl.replace(/\/$/, ''); // strip trailing slash if any present
  const path = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

  return `${base}${path}`;
}
