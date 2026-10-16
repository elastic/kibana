/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: clintandrewhall - Replace this file with SDK exports once https://github.com/elastic/isomer/issues/221 ships.

import type { UrlTransform } from 'react-markdown';
import { sanitizeAssetUrl, sanitizeNavigationHref } from '@elastic/isomer-sdk';

// Micromark is superlinear past these, the same bounds the SDK uses before parsing authored Markdown.
const MAX_PARSE_LENGTH = 16_384;
const MAX_LINE_PREFIX = 256;
const MAX_INLINE_DELIMITERS = 2_048;

/** Whether `markdown` is past the SDK's authored-markdown parse budget. */
export const exceedsParseBudget = (markdown: string): boolean => {
  if (markdown.length > MAX_PARSE_LENGTH) {
    return true;
  }
  // Fresh regexes: a global `RegExp` keeps `lastIndex`, and `matchAll` resumes from it.
  const linePrefix = /^(?:[ \t>]|[-*+](?=[ \t])|\d{1,9}[.)](?=[ \t]))+/gm;
  for (const [prefix] of markdown.matchAll(linePrefix)) {
    if (prefix.length > MAX_LINE_PREFIX) {
      return true;
    }
  }
  const delimiters = markdown.match(
    /\\[!-/:-@[-`{-~]|[[\]*`~<>|\\]|(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu
  );
  return (delimiters?.length ?? 0) > MAX_INLINE_DELIMITERS;
};

const stripControls = (value: string): string => {
  let stripped = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x20 && code !== 0x7f) {
      stripped += char;
    }
  }
  return stripped.trim();
};

// Destinations arriving here are already decoded. Holding `&` as `%26` keeps
// `sanitizeNavigationHref` from decoding character references again, which is
// what `sanitizeParsedNavigationHref` and `sanitizeParsedAssetUrl` do.
const AMPERSAND_PROBE = '%26';

const sanitizeParsedDestination = (
  url: string,
  sanitize: (value: string) => string | null
): string | null => {
  const normalized = stripControls(url);
  const probe = normalized.replaceAll('&', AMPERSAND_PROBE);
  return sanitize(probe) === null ? null : normalized;
};

/** Navigation policy for `href`, asset policy for `src`, on an already-decoded destination. */
export const urlTransform: UrlTransform = (url, key) =>
  sanitizeParsedDestination(url, key === 'src' ? sanitizeAssetUrl : sanitizeNavigationHref) ?? '';
