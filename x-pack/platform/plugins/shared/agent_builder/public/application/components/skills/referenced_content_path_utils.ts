/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeRelativePathSegments } from '@kbn/agent-builder-common';

export { normalizeRelativePathSegments };

/**
 * Builds a human-friendly display path: `{skillFolder}/{subPath}/{fileName}.md`.
 * Uses {@link normalizeRelativePathSegments} for validation-style normalization, then strips
 * a leading `./` from the folder segment **only for this preview** (root becomes no extra segment).
 * Collapses duplicate slashes between parts.
 */
export const buildReferencedContentFullPathPreview = (
  skillFolderSegment: string,
  relativePath: string,
  fileNameWithoutExtension: string
): string => {
  const normPath = normalizeRelativePathSegments(relativePath);
  const previewSubPath = normPath === './' ? '' : normPath.replace(/^\.\//, '');
  const base = skillFolderSegment.trim();
  const name = fileNameWithoutExtension.trim();
  const file = name.length > 0 ? `${name}.md` : '.md';
  const joined = [base, previewSubPath, file].filter((segment) => segment.length > 0).join('/');
  return joined.replace(/\/{2,}/g, '/');
};
