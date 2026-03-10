/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Resolves the full EARS URL by combining the configured base URL with the path
 * from the stored URL (which may be a full URL or just a path).
 * If no base URL is configured, returns the stored URL as-is.
 */
// todo: refactor
export function resolveEarsUrl(storedUrl: string, earsBaseUrl: string | undefined): string {
  if (!earsBaseUrl) return storedUrl;
  const base = earsBaseUrl.replace(/\/$/, '');
  let path: string;
  try {
    path = new URL(storedUrl).pathname;
  } catch {
    path = storedUrl.startsWith('/') ? storedUrl : `/${storedUrl}`;
  }
  return `${base}${path}`;
}
