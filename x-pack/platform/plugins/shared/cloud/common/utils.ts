/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getFullCloudUrl(baseUrl: string | undefined, dirPath: string | undefined) {
  if (baseUrl && dirPath) {
    return `${baseUrl}${dirPath}`;
  }

  return '';
}

/**
 * Appends a query string to a Cloud project page URL, or returns `undefined` when there is no project URL.
 */
export function getProjectPageUrl(projectUrl: string, query: string): string | undefined {
  if (!projectUrl) {
    return undefined;
  }

  // Cloud navigation breaks when the project URL keeps a trailing forward slash before the query string.
  return `${projectUrl.replace(/\/$/, '')}?${query}`;
}
