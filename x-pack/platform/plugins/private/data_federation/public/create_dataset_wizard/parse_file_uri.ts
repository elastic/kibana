/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSourceType } from '../../common';
import type { DatasetFormatFormValue } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { inferFormatFromResource } from './infer_format_from_resource';

export interface ParsedFileUri {
  type: DataSourceType;
  bucket: string;
  /** Static prefix before the first glob segment, with a trailing slash. */
  prefix: string;
  formatHint: DatasetFormatFormValue | '';
}

const SCHEMES_TO_TYPES: ReadonlyArray<readonly [string, DataSourceType]> = [
  ['s3://', 's3'],
  ['s3a://', 's3'],
  ['s3n://', 's3'],
  ['gs://', 'gcs'],
  ['https://', 'azure'],
] as const;

const GLOB_CHARACTERS = /[*?[\]{}]/;

const matchScheme = (resource: string): readonly [string, DataSourceType] | undefined => {
  const lowercased = resource.toLowerCase();

  return SCHEMES_TO_TYPES.find(([scheme]) => lowercased.startsWith(scheme));
};

const getStaticPrefixSegments = (segments: readonly string[]): string[] => {
  const prefixSegments: string[] = [];

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];

    if (GLOB_CHARACTERS.test(segment)) {
      break;
    }

    const isFileName = index === segments.length - 1 && segment.includes('.');
    if (isFileName) {
      break;
    }

    prefixSegments.push(segment);
  }

  return prefixSegments;
};

export const parseFileUri = (resource: string): ParsedFileUri | undefined => {
  const trimmed = resource?.trim() ?? '';
  const scheme = matchScheme(trimmed);

  if (!scheme) {
    return undefined;
  }

  const [schemePrefix, type] = scheme;
  const path = trimmed.slice(schemePrefix.length).split(/[?#]/)[0];
  const segments = path.split('/').filter(Boolean);
  // Azure URIs start with the storage account host, and the container is what
  // plays the role of a bucket.
  const bucketAndPath = type === 'azure' ? segments.slice(1) : segments;
  const [bucket = '', ...rest] = bucketAndPath;
  const prefixSegments = getStaticPrefixSegments(rest);

  return {
    type,
    bucket,
    prefix: prefixSegments.length > 0 ? `${prefixSegments.join('/')}/` : '',
    formatHint: inferFormatFromResource(trimmed),
  };
};
