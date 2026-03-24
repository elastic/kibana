/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Title segment for SML command-menu highlighting (`type/foo` → highlight title with `foo`).
 */
export const segmentKeywordForSmlTitleHighlight = (keyword: string): string | undefined => {
  const trimmed = keyword.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const slashIdx = trimmed.indexOf('/');
  if (slashIdx === -1) {
    return trimmed;
  }
  const afterSlash = trimmed.slice(slashIdx + 1).trim();
  return afterSlash.length > 0 ? afterSlash : undefined;
};

/**
 * Type segment for SML command-menu highlighting (`foo/bar` → highlight type with `foo`).
 */
export const segmentKeywordForSmlTypeHighlight = (keyword: string): string | undefined => {
  const trimmed = keyword.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const slashIdx = trimmed.indexOf('/');
  if (slashIdx === -1) {
    return trimmed;
  }
  const beforeSlash = trimmed.slice(0, slashIdx).trim();
  return beforeSlash.length > 0 ? beforeSlash : undefined;
};

/**
 * `EuiHighlight` matches literal substrings. Trailing `*` is a prefix wildcard in the command menu
 * (e.g. type segment `visu` + `*` before the slash); strip stars so `visu` matches `visualization`.
 */
export const normalizeSmlSegmentForEuiHighlight = (segment: string): string => {
  return segment.replace(/\*+$/g, '').trim();
};

export const getSmlCommandMenuHighlightNeedles = (
  rawQuery: string
): { titleSearch: string; typeSearch: string } => {
  const trimmed = rawQuery.trim();
  if (trimmed.length === 0 || trimmed === '*') {
    return { titleSearch: '', typeSearch: '' };
  }
  const title = segmentKeywordForSmlTitleHighlight(trimmed);
  const type = segmentKeywordForSmlTypeHighlight(trimmed);
  return {
    titleSearch: normalizeSmlSegmentForEuiHighlight(title ?? ''),
    typeSearch: normalizeSmlSegmentForEuiHighlight(type ?? ''),
  };
};
