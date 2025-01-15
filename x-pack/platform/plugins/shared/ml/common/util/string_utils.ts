/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A simple template renderer, it replaces mustache/angular style {{...}} tags with
// the values provided via the data object
export function renderTemplate(str: string, data?: Record<string, string>): string {
  const matches = str.match(/{{(.*?)}}/g);

  if (Array.isArray(matches) && data !== undefined) {
    matches.forEach((v) => {
      str = str.replace(v, data[v.replace(/{{|}}/g, '')]);
    });
  }

  return str;
}

export function getMedianStringLength(strings: string[]) {
  const sortedStringLengths = strings.map((s) => s.length).sort((a, b) => a - b);
  return sortedStringLengths[Math.floor(sortedStringLengths.length / 2)] || 0;
}

export function getGroupQueryText(groupIds: string[]): string {
  return `groups:(${groupIds.join(' or ')})`;
}

export function getJobQueryText(jobIds: string | string[]): string {
  return Array.isArray(jobIds) ? `id:(${jobIds.join(' OR ')})` : `id:${jobIds}`;
}
