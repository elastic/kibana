/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_ROBOTS_LENGTH = 500_000;
const MAX_RULES_PER_GROUP = 2000;
const MAX_SITEMAPS = 20;
const WILDCARD_AGENT = '*';
const DECIMAL_NUMBER = /^\d{1,9}(\.\d{1,9})?$/;

const NOT_PRINTABLE_ASCII = /[^\x21-\x7e]+/g;
const PERCENT_ESCAPE = /%[0-9a-f]{2}/gi;
const UNRESERVED = /[A-Za-z0-9\-._~]/;

// `%7E` and `~` are the same character
const normalizeEscape = (escape: string): string => {
  const char = String.fromCharCode(parseInt(escape.slice(1), 16));
  return UNRESERVED.test(char) ? char : escape.toUpperCase();
};

// URLs percent-encode their path, robots.txt may not
const toComparablePath = (path: string): string => {
  let encoded = path;
  try {
    encoded = path.replace(NOT_PRINTABLE_ASCII, encodeURIComponent);
  } catch {
    // Lone surrogates can't be encoded and can't appear in a URL
  }
  return encoded.replace(PERCENT_ESCAPE, normalizeEscape);
};

interface RobotsRule {
  allow: boolean;
  pattern: string;
}

interface RobotsGroup {
  rules: RobotsRule[];
  crawlDelayMs?: number;
  isTruncated?: boolean;
}

export interface RobotsRules {
  isAllowed: (url: string) => boolean;
  sitemaps: string[];
  /** From `Crawl-delay`, if it's a positive number */
  crawlDelayMs?: number;
  /** The file had more rules than we keep, so some disallowed paths may be treated as allowed */
  isTruncated?: boolean;
}

export const ALLOW_ALL_ROBOTS: RobotsRules = { isAllowed: () => true, sitemaps: [] };

/** `*` matches any characters, a trailing `$` anchors the end */
const matchesPattern = (pattern: string, path: string): boolean => {
  const isEndAnchored = pattern.endsWith('$');
  const segments = (isEndAnchored ? pattern.slice(0, -1) : pattern).split('*');
  const [prefix] = segments;
  if (!path.startsWith(prefix)) {
    return false;
  }
  if (segments.length === 1) {
    return !isEndAnchored || path.length === prefix.length;
  }

  let position = prefix.length;
  const lastIndex = segments.length - 1;
  for (let index = 1; index < lastIndex; index++) {
    const found = path.indexOf(segments[index], position);
    if (found === -1) {
      return false;
    }
    position = found + segments[index].length;
  }

  const lastSegment = segments[lastIndex];
  if (isEndAnchored) {
    return path.length - lastSegment.length >= position && path.endsWith(lastSegment);
  }
  return path.indexOf(lastSegment, position) !== -1;
};

const parseLine = (line: string): { field: string; value: string } | undefined => {
  const commentIndex = line.indexOf('#');
  const content = commentIndex === -1 ? line : line.slice(0, commentIndex);
  const separatorIndex = content.indexOf(':');
  if (separatorIndex === -1) {
    return undefined;
  }
  return {
    field: content.slice(0, separatorIndex).trim().toLowerCase(),
    value: content.slice(separatorIndex + 1).trim(),
  };
};

/**
 * Parses robots.txt into the rules for `userAgentToken`.
 *
 * Groups that name the token win over `*` groups. For a URL, the longest matching pattern wins, and
 * `Allow` wins ties.
 */
export const parseRobotsTxt = (content: string, userAgentToken: string): RobotsRules => {
  const token = userAgentToken.toLowerCase();
  const tokenGroup: RobotsGroup = { rules: [] };
  const wildcardGroup: RobotsGroup = { rules: [] };
  const sitemaps: string[] = [];
  let hasTokenGroup = false;
  let groupTargets: RobotsGroup[] = [];
  let isReadingAgents = false;

  for (const line of content.slice(0, MAX_ROBOTS_LENGTH).split('\n')) {
    const parsed = parseLine(line);
    if (!parsed) {
      continue;
    }
    const { field, value } = parsed;

    if (field === 'user-agent') {
      if (!isReadingAgents) {
        groupTargets = [];
        isReadingAgents = true;
      }
      const agent = value.toLowerCase();
      if (agent === WILDCARD_AGENT) {
        groupTargets.push(wildcardGroup);
      } else if (agent === token) {
        hasTokenGroup = true;
        groupTargets.push(tokenGroup);
      }
    } else if (field === 'allow' || field === 'disallow') {
      isReadingAgents = false;
      if (value.length > 0) {
        for (const group of groupTargets) {
          if (group.rules.length < MAX_RULES_PER_GROUP) {
            group.rules.push({ allow: field === 'allow', pattern: toComparablePath(value) });
          } else {
            group.isTruncated = true;
          }
        }
      }
    } else if (field === 'crawl-delay') {
      isReadingAgents = false;
      const seconds = DECIMAL_NUMBER.test(value) ? Number(value) : 0;
      if (seconds > 0) {
        for (const group of groupTargets) {
          group.crawlDelayMs = seconds * 1000;
        }
      }
    } else if (field === 'sitemap') {
      if (value.length > 0 && sitemaps.length < MAX_SITEMAPS) {
        sitemaps.push(value);
      }
    }
    // Ignore unknown lines, even between the `User-agent` lines of a group
  }

  const { rules, crawlDelayMs, isTruncated } = hasTokenGroup ? tokenGroup : wildcardGroup;

  const isAllowed = (url: string): boolean => {
    const { pathname, search } = new URL(url);
    const path = toComparablePath(`${pathname}${search}`);
    let longestMatch = -1;
    let allowed = true;
    for (const { allow, pattern } of rules) {
      const isMoreSpecific =
        pattern.length > longestMatch || (pattern.length === longestMatch && allow);
      if (isMoreSpecific && matchesPattern(pattern, path)) {
        longestMatch = pattern.length;
        allowed = allow;
      }
    }
    return allowed;
  };

  return {
    isAllowed,
    sitemaps,
    crawlDelayMs,
    isTruncated: isTruncated || content.length > MAX_ROBOTS_LENGTH,
  };
};
