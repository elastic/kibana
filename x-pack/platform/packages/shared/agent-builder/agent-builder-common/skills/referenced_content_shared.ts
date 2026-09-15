/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const maxReferencedContentItems = 100;

export const normalizeRelativePathSegments = (relativePath: string): string => {
  const trimmed = relativePath.trim();
  if (trimmed === '.' || trimmed === './') {
    return './';
  }
  const rest = trimmed.startsWith('./') ? trimmed.slice(2) : trimmed;
  const segments = rest.split('/').filter((segment) => segment.length > 0);
  return segments.length === 0 ? './' : `./${segments.join('/')}`;
};

export const isRootRelativePath = (relativePath: string): boolean =>
  normalizeRelativePathSegments(relativePath) === './';

export const canComputeReferencedContentUniquenessKey = (relativePath: string): boolean => {
  const trimmed = relativePath.trim();
  return trimmed.startsWith('./') && !trimmed.includes('../');
};
