/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const KIBANA_PR_BASE_URL = 'https://github.com/elastic/kibana/pull';

export const isLikelyUrl = (value: string): boolean => /^https?:\/\//i.test(value);

export const resolvePrUrl = (pullRequest: string): string | null => {
  const raw = pullRequest.trim();
  if (!raw || raw === 'false') return null;
  if (isLikelyUrl(raw)) return raw;
  if (/^\d+$/.test(raw)) {
    return `${KIBANA_PR_BASE_URL}/${raw}`;
  }
  return null;
};
