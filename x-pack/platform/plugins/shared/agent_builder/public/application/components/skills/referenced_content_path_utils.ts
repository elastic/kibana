/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Collapses redundant slashes in a relative folder path (aligned with validation and full-path preview).
 */
export const normalizeRelativePathSegments = (relativePath: string): string => {
  const trimmed = relativePath.trim();
  if (trimmed === '.' || trimmed === './') {
    return './';
  }
  const rest = trimmed.startsWith('./') ? trimmed.slice(2) : trimmed;
  const segments = rest.split('/').filter((segment) => segment.length > 0);
  return segments.length === 0 ? './' : `./${segments.join('/')}`;
};

/**
 * Builds the display path: `{skillFolder}/{normalizedRelativePath}/{fileName}.md`,
 * collapsing duplicate slashes between segments.
 */
export const buildReferencedContentFullPathPreview = (
  skillFolderSegment: string,
  relativePath: string,
  fileNameWithoutExtension: string
): string => {
  const normPath = normalizeRelativePathSegments(relativePath);
  const base = skillFolderSegment.trim();
  const name = fileNameWithoutExtension.trim();
  const file = name.length > 0 ? `${name}.md` : '.md';
  const joined = [base, normPath, file].filter((segment) => segment.length > 0).join('/');
  return joined.replace(/\/{2,}/g, '/');
};
