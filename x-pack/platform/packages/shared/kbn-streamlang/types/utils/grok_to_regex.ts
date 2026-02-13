/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PATTERN_MAP } from '@kbn/grok-ui/constants/pattern_map';

/**
 * Base Grok pattern definitions.
 * These are sourced from the official @kbn/grok-ui package which mirrors
 * Elasticsearch's built-in Grok patterns.
 *
 * The PATTERN_MAP contains all official patterns including:
 * - Basic: USERNAME, USER, INT, NUMBER, WORD, UUID, etc.
 * - Network: IP, IPV4, IPV6, MAC, HOSTNAME, etc.
 * - Email: EMAILADDRESS, EMAILLOCALPART
 * - Paths: PATH, UNIXPATH, WINPATH, URI, etc.
 * - Timestamps: TIMESTAMP_ISO8601, SYSLOGTIMESTAMP, HTTPDATE, etc.
 * - Log formats: LOGLEVEL, SYSLOGBASE, COMMONAPACHELOG, etc.
 */
export const BASE_GROK_PATTERNS: Record<string, string> = PATTERN_MAP;

/**
 * Result of compiling a Grok pattern for redaction.
 */
export interface CompiledRedactPattern {
  /** The compiled regular expression pattern */
  regex: string;
  /** The semantic name extracted from the pattern (e.g., "client" from %{IP:client}) */
  semanticName: string;
}

/**
 * Parses a single Grok pattern and extracts the syntax and semantic parts.
 *
 * Grok pattern syntax: %{SYNTAX:SEMANTIC[:TYPE]}
 * - SYNTAX: The pattern name (e.g., IP, EMAILADDRESS)
 * - SEMANTIC: The field name for the captured value (e.g., client, email)
 * - TYPE: Optional type conversion (int, float) - not used for redaction
 *
 * @param pattern - A Grok pattern like "%{IP:client}" or "%{EMAILADDRESS:email}"
 * @returns The parsed syntax and semantic, or null if invalid
 */
export function parseGrokPatternParts(
  pattern: string
): { syntax: string; semantic: string } | null {
  // Match %{SYNTAX:SEMANTIC} or %{SYNTAX:SEMANTIC:TYPE}
  const match = pattern.match(/%\{([A-Z0-9_]+)(?::([A-Za-z0-9_@#$%&*+=\-\.]+))?(?::[A-Za-z]+)?\}/);

  if (!match) {
    return null;
  }

  const syntax = match[1];
  const semantic = match[2] || syntax; // Use syntax name as semantic if not provided

  return { syntax, semantic };
}

/**
 * Compiles a Grok pattern to a regular expression for use in redaction.
 *
 * @param pattern - A Grok pattern like "%{IP:client}"
 * @param customPatternDefinitions - Optional custom pattern definitions
 * @returns The compiled pattern with regex and semantic name, or null if pattern is unknown
 *
 * @example
 * compileGrokPatternToRegex("%{IP:client}")
 * // Returns: { regex: "(?:...IP regex...)", semanticName: "client" }
 *
 * @example
 * compileGrokPatternToRegex("%{EMAILADDRESS:email}")
 * // Returns: { regex: "(?:...email regex...)", semanticName: "email" }
 */
export function compileGrokPatternToRegex(
  pattern: string,
  customPatternDefinitions?: Record<string, string>
): CompiledRedactPattern | null {
  const parsed = parseGrokPatternParts(pattern);

  if (!parsed) {
    return null;
  }

  const { syntax, semantic } = parsed;

  // Check custom definitions first, then fall back to base patterns
  let regexPattern = customPatternDefinitions?.[syntax] ?? BASE_GROK_PATTERNS[syntax];

  if (!regexPattern) {
    return null;
  }

  // Resolve any nested pattern references in the regex
  regexPattern = resolveNestedPatterns(regexPattern, customPatternDefinitions);

  // Wrap in non-capturing group for safety
  return {
    regex: `(?:${regexPattern})`,
    semanticName: semantic,
  };
}

/**
 * Maximum pattern length to prevent ReDoS attacks.
 * This is a generous limit that should accommodate any legitimate Grok pattern.
 */
const MAX_PATTERN_LENGTH = 10000;

/**
 * Resolves nested Grok pattern references within a regex pattern.
 * For example, %{IPV4} within a pattern definition.
 *
 * @param pattern - The pattern that may contain nested references
 * @param customPatternDefinitions - Optional custom pattern definitions
 * @param seen - Set of already-seen patterns to prevent infinite recursion
 * @returns The fully resolved regex pattern
 */
function resolveNestedPatterns(
  pattern: string,
  customPatternDefinitions?: Record<string, string>,
  seen: Set<string> = new Set()
): string {
  // Safety check to prevent ReDoS on excessively long patterns
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return pattern;
  }

  // Match nested pattern references like %{PATTERN} or %{PATTERN:field} or %{PATTERN:field:type}
  const nestedPatternRegex = /%\{([A-Z0-9_]+)(?::[A-Za-z0-9_@#$%&*+=.\-]*)?(?::[a-z]*)?\}/g;

  return pattern.replace(nestedPatternRegex, (match, nestedSyntax) => {
    // Prevent infinite recursion
    if (seen.has(nestedSyntax)) {
      return match;
    }

    const nestedPattern =
      customPatternDefinitions?.[nestedSyntax] ?? BASE_GROK_PATTERNS[nestedSyntax];

    if (!nestedPattern) {
      return match; // Leave unresolved if pattern not found
    }

    seen.add(nestedSyntax);
    const resolved = resolveNestedPatterns(nestedPattern, customPatternDefinitions, seen);
    seen.delete(nestedSyntax);

    return `(?:${resolved})`;
  });
}

/**
 * Compiles multiple Grok patterns for use in redaction.
 *
 * @param patterns - Array of Grok patterns like ["%{IP:client}", "%{EMAILADDRESS:email}"]
 * @param customPatternDefinitions - Optional custom pattern definitions
 * @returns Array of compiled patterns (only valid patterns are returned)
 */
export function compileGrokPatternsToRegex(
  patterns: string[],
  customPatternDefinitions?: Record<string, string>
): CompiledRedactPattern[] {
  return patterns
    .map((pattern) => compileGrokPatternToRegex(pattern, customPatternDefinitions))
    .filter((result): result is CompiledRedactPattern => result !== null);
}

/**
 * Checks if a pattern name is a known Grok pattern.
 *
 * @param patternName - The pattern name to check (e.g., "IP", "EMAILADDRESS")
 * @returns true if the pattern is known
 */
export function isKnownGrokPattern(patternName: string): boolean {
  return patternName in BASE_GROK_PATTERNS;
}

/**
 * Gets all available Grok pattern names.
 *
 * @returns Array of pattern names
 */
export function getAvailableGrokPatterns(): string[] {
  return Object.keys(BASE_GROK_PATTERNS);
}
