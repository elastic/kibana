/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getGroupQueryText(groupIds: string[]): string {
  return `groups:(${groupIds.join(' or ')})`;
}

export function getJobQueryText(jobIds: string | string[]): string {
  return Array.isArray(jobIds) ? `id:(${jobIds.join(' OR ')})` : `id:${jobIds}`;
}
