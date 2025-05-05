/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parses semantic names from a Grok pattern string.
 * Handles patterns like %{SYNTAX:SEMANTIC}, %{SYNTAX:SEMANTIC:TYPE},
 * and regular expression named capture groups (?<SEMANTIC>...).
 *
 * @param grokPattern The Grok pattern string to parse.
 * @returns An array of unique semantic names found in the pattern.
 */
export function parseSemanticNames(grokPattern: string): string[] {
  const names = new Set<string>();

  // Regex for %{SYNTAX:SEMANTIC} or %{SYNTAX:SEMANTIC:TYPE}
  const grokSyntaxRegex = /%\{[^:]+:([^:}]+)(?::[^}]+)?\}/g;
  // Regex for (?<SEMANTIC>...)
  const namedCaptureRegex = /\(\?<([^>]+)>/g;

  let match;

  // Find all matches for the %{...} syntax
  while ((match = grokSyntaxRegex.exec(grokPattern)) !== null) {
    if (match[1]) {
      names.add(match[1]);
    }
  }

  // Find all matches for the (?<...>) syntax
  while ((match = namedCaptureRegex.exec(grokPattern)) !== null) {
    if (match[1]) {
      names.add(match[1]);
    }
  }

  return Array.from(names);
}

/**
 * Replaces semantic names within a Grok pattern using a provided replacer function.
 * Handles patterns like %{SYNTAX:SEMANTIC}, %{SYNTAX:SEMANTIC:TYPE},
 * and regular expression named capture groups (?<SEMANTIC>...).
 *
 * @param grokPattern The original Grok pattern string.
 * @param replacerFn A function that takes an existing semantic name and returns the new name.
 * @returns A new Grok pattern string with semantic names replaced.
 */
export function replaceSemanticNames(
  grokPattern: string,
  replacerFn: (oldName: string) => string
): string {
  let currentPattern = grokPattern;

  // --- Replace names in %{SYNTAX:SEMANTIC[:TYPE]} format ---
  // Regex captures:
  // Group 1: SYNTAX
  // Group 2: SEMANTIC (the name to replace)
  // Group 3: Optional [:TYPE] part (including the colon if present)
  const grokSyntaxReplaceRegex = /%\{([^:]+):([^:}]+)((?::[^}]+)?)\}/g;

  currentPattern = currentPattern.replace(
    grokSyntaxReplaceRegex,
    (match, syntax: string, semantic: string, typePart: string | undefined) => {
      const newName = replacerFn(semantic);
      // Reconstruct the pattern part with the new name
      // Ensure typePart is appended only if it existed (it includes the ':' if present)
      return `%{${syntax}:${newName}${typePart || ''}}`;
    }
  );

  // --- Replace names in (?<SEMANTIC>...) format ---
  // Regex captures:
  // Group 1: SEMANTIC (the name to replace)
  const namedCaptureReplaceRegex = /\(\?<([^>]+)>/g;

  currentPattern = currentPattern.replace(namedCaptureReplaceRegex, (match, semantic: string) => {
    const newName = replacerFn(semantic);
    // Reconstruct the named capture group opening with the new name
    return `(?<${newName}>`;
  });

  return currentPattern;
}
