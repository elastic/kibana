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
 * Makes Cloud UI open `organizationId` instead of the organization the user visited last.
 * The hash must stay last, so append paths and query strings before calling this.
 */
export function withTargetOrganization(url: string, organizationId: string | undefined): string {
  if (!url || !organizationId) {
    return url;
  }

  // Cloud navigation breaks when the URL keeps a trailing forward slash before the hash.
  return `${url.replace(/\/$/, '')}#uTargetOrganizationId=${encodeURIComponent(organizationId)}`;
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
