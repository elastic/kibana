/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseFileUri } from './parse_file_uri';

const NON_ALPHANUMERIC = /[^a-z0-9]+/g;

const toTokens = (value: string): string[] =>
  value.toLowerCase().replace(NON_ALPHANUMERIC, ' ').trim().split(' ').filter(Boolean);

/**
 * Derives a dataset name from a file URI as the first bucket token joined with
 * the first prefix segment, e.g. `s3://acme-logs/vpcflow/**` -> `acme_vpcflow`.
 */
export const deriveDatasetNameFromUri = (resource: string): string => {
  const parsed = parseFileUri(resource);

  if (!parsed) {
    return '';
  }

  const [bucketToken] = toTokens(parsed.bucket);
  const [firstPrefixSegment] = parsed.prefix.split('/').filter(Boolean);
  const prefixTokens = firstPrefixSegment ? toTokens(firstPrefixSegment) : [];

  return [bucketToken, ...prefixTokens].filter(Boolean).join('_');
};
