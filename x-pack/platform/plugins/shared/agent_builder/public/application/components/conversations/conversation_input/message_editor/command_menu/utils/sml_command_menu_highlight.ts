/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Search strings for {@link @elastic/eui#EuiHighlight} on SML command-menu rows (type / title).
 * The menu treats trailing `*` as a prefix wildcard; the highlighter matches literals only, so
 * those suffixes are stripped when building these values.
 */
export interface SmlMenuHighlightSearchStrings {
  readonly type: string;
  readonly title: string;
}

const parseSlashQueryParts = (keyword: string): SmlMenuHighlightSearchStrings => {
  const trimmed = keyword.trim();
  if (trimmed.length === 0) {
    return { type: '', title: '' };
  }
  const slashIdx = trimmed.indexOf('/');
  if (slashIdx === -1) {
    return { type: trimmed, title: trimmed };
  }
  const beforeSlash = trimmed.slice(0, slashIdx).trim();
  const afterSlash = trimmed.slice(slashIdx + 1).trim();

  return {
    type: beforeSlash,
    title: afterSlash,
  };
};

/**
 * Builds `search` props for two {@link @elastic/eui#EuiHighlight} instances (attachment type vs title)
 * from the raw SML menu query (`type/title`, optional `*` before `/`).
 */
export const getSmlMenuHighlightSearchStrings = (
  rawQuery: string
): SmlMenuHighlightSearchStrings => {
  const trimmed = rawQuery.trim();
  if (trimmed.length === 0 || trimmed === '*') {
    return { type: '', title: '' };
  }

  return parseSlashQueryParts(trimmed);
};
