/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Well-known public sites. A model gains context from seeing them and they identify nothing about
// the customer, so a host match equal to one of these (or a subdomain of one) is left in the clear.
// Keep this short: a customer's own domain on the list would never be masked.
const PUBLIC_DOMAINS = [
  'github.com',
  'githubusercontent.com',
  'gitlab.com',
  'stackoverflow.com',
  'mitre.org',
  'nist.gov',
  'cisa.gov',
  'owasp.org',
  'virustotal.com',
  'microsoft.com',
  'ss64.com',
  'wikipedia.org',
];

const isPublicDomain = (host: string): boolean => {
  const lower = host.toLowerCase();
  return PUBLIC_DOMAINS.some((domain) => lower === domain || lower.endsWith(`.${domain}`));
};

const WORD_CHAR = /\w/;

/**
 * Some built-in rules need context a pattern cannot express: patterns here must run on both
 * native `RegExp` and RE2, and RE2 has no lookbehind. A filter sees the full text and the span a
 * rule matched, and returns `false` to drop that match. Filters apply to built-in rules only;
 * custom rules are never filtered.
 */
const FILTERS: Record<string, (text: string, start: number, end: number) => boolean> = {
  // `WINDOWS\System32` inside `C:\WINDOWS\System32` or `/usr/SHARE/x` is a path segment, not an
  // account: a real `DOMAIN\account` is not glued to another path component.
  'builtin-account-login': (text, start) => {
    const before = text[start - 1];
    return before !== '\\' && before !== '/';
  },
  'builtin-host-name': (text, start, end) => !isPublicDomain(text.slice(start, end)),
  // `std::string` and `a::int` are code, not addresses: a real address is not glued to a word.
  'builtin-ipv6': (text, start, end) => {
    const before = text[start - 1];
    const after = text[end];
    return (
      !(before && (WORD_CHAR.test(before) || before === ':')) && !(after && WORD_CHAR.test(after))
    );
  },
};

/** Returns `false` when the built-in rule `ruleId` should ignore the match at `[start, end)`. */
export const shouldKeepBuiltInMatch = (
  ruleId: string | undefined,
  text: string,
  start: number,
  end: number
): boolean => (ruleId === undefined ? true : FILTERS[ruleId]?.(text, start, end) ?? true);
