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
const HOST_CONTINUES = /^(?:\.[A-Za-z0-9]|[A-Za-z0-9-])/;

export interface MatchSpan {
  start: number;
  end: number;
}

/**
 * Some built-in rules need context a pattern cannot express: patterns here must run on both
 * native `RegExp` and RE2, and RE2 has no lookbehind. A filter sees the full text and the span a
 * rule matched, and returns the span to mask (possibly narrower) or `undefined` to drop the
 * match. Filters apply to built-in rules only; custom rules are never filtered.
 */
const FILTERS: Record<string, (text: string, start: number, end: number) => MatchSpan | undefined> =
  {
    // `WINDOWS\System32` inside `C:\WINDOWS\System32` or `/usr/SHARE/x` is a path segment, not an
    // account: a real `DOMAIN\account` is not glued to another path component. Only the account
    // name is masked, not `DOMAIN\`: the masked text then has no backslashes, so restoring it is
    // exact in every escaping layer (JSON in JSON, structured model output, tool arguments), where
    // a masked `DOMAIN\\\\account` came back with a different number of backslashes.
    'builtin-account-login': (text, start, end) => {
      const before = text[start - 1];
      if (before === '\\' || before === '/') {
        return undefined;
      }
      const separator = /^[A-Z][A-Z0-9-]*\\+/.exec(text.slice(start, end));
      return separator ? { start: start + separator[0].length, end } : undefined;
    },
    // A match followed by more host characters (`secret.github.com.network`) is a prefix of a
    // longer private name, not the public site itself, so it is masked.
    'builtin-host-name': (text, start, end) =>
      !HOST_CONTINUES.test(text.slice(end, end + 2)) && isPublicDomain(text.slice(start, end))
        ? undefined
        : { start, end },
    // `std::string` and `a::int` are code, not addresses: a real address is not glued to a word.
    'builtin-ipv6': (text, start, end) => {
      const before = text[start - 1];
      const after = text[end];
      const glued =
        (before && (WORD_CHAR.test(before) || before === ':')) || (after && WORD_CHAR.test(after));
      return glued ? undefined : { start, end };
    },
  };

/**
 * Returns the span built-in rule `ruleId` should mask for a match at `[start, end)`, or
 * `undefined` when the rule should ignore the match.
 */
export const refineBuiltInMatch = (
  ruleId: string | undefined,
  text: string,
  start: number,
  end: number
): MatchSpan | undefined =>
  ruleId === undefined || !FILTERS[ruleId] ? { start, end } : FILTERS[ruleId](text, start, end);
