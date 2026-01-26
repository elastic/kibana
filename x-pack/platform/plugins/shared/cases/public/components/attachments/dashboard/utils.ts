/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Gets the URL for a dashboard attachment.
 * Uses inAppUrl if available, otherwise falls back to the dashboard app URL.
 *
 * @param attachmentId - The dashboard attachment ID
 * @param inAppUrl - Optional in-app URL path from metadata
 * @returns The dashboard URL path
 */
export const getDashboardUrl = (attachmentId: string, inAppUrl?: string): string => {
  return inAppUrl || `/app/dashboards#/view/${attachmentId}`;
};
