/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AWS_REGIONS } from './aws_regions';

const S3_RESOURCE_SCHEMES = ['s3://', 's3a://', 's3n://'] as const;

const AWS_REGION_IDS_BY_LOWERCASE: Record<string, string> = Object.fromEntries(
  AWS_REGIONS.map((region) => [region.id.toLowerCase(), region.id])
);

const hasS3Scheme = (value: string): boolean =>
  S3_RESOURCE_SCHEMES.some((scheme) => value.toLowerCase().startsWith(scheme));

const canonicalizeAwsRegionId = (value: string): string =>
  AWS_REGION_IDS_BY_LOWERCASE[value.trim().toLowerCase()] ?? '';

const splitResourceUri = (resource: string): { path: string; query: string } => {
  const hashIndex = resource.indexOf('#');
  const withoutHash = hashIndex === -1 ? resource : resource.slice(0, hashIndex);
  const queryIndex = withoutHash.indexOf('?');
  if (queryIndex === -1) {
    return { path: withoutHash, query: '' };
  }

  return {
    path: withoutHash.slice(0, queryIndex),
    query: withoutHash.slice(queryIndex + 1),
  };
};

const stripS3Scheme = (value: string): string => {
  const lower = value.toLowerCase();
  const scheme = S3_RESOURCE_SCHEMES.find((candidate) => lower.startsWith(candidate));
  return scheme ? value.slice(scheme.length) : value;
};

export const inferRegionFromResource = (resource: string): string => {
  const trimmed = resource.trim();
  if (!trimmed || !hasS3Scheme(trimmed)) {
    return '';
  }

  const { path, query } = splitResourceUri(trimmed);

  if (query) {
    const regionFromQuery = new URLSearchParams(query).get('region');
    if (regionFromQuery) {
      const canonicalFromQuery = canonicalizeAwsRegionId(regionFromQuery);
      if (canonicalFromQuery) {
        return canonicalFromQuery;
      }
    }
  }

  const pathSegments = stripS3Scheme(path).split('/').filter(Boolean);
  for (const segment of pathSegments) {
    const canonicalFromPath = canonicalizeAwsRegionId(segment);
    if (canonicalFromPath) {
      return canonicalFromPath;
    }
  }

  return '';
};
