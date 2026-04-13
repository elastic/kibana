/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isStringArray } from './string_utils';

export interface IndexMetadata {
  index?: string | string[];
}

export const isIndexMetadata = (
  metadata: unknown
): metadata is IndexMetadata | null | undefined => {
  if (metadata == null) {
    return true;
  }

  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }

  const candidate = metadata as Record<string, unknown>;
  if (candidate.index == null) {
    return true;
  }

  return typeof candidate.index === 'string' || isStringArray(candidate.index);
};

export const assertValidIndexMetadata = (metadata: unknown): void => {
  if (!isIndexMetadata(metadata)) {
    throw new Error('metadata.index must be a string or an array of strings');
  }
};

export const getIndexFromMetadata = (metadata: unknown): string | string[] | undefined => {
  if (metadata == null || !isIndexMetadata(metadata)) {
    return undefined;
  }

  return metadata.index;
};
