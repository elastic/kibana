/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parses a simple OTTL-style field access string into an array of segments.
 *
 * This parser handles:
 * - Dot notation (e.g., resource.attributes)
 * - Bracket notation with double quotes (e.g., attributes["service.name"])
 * - Bracket notation with single quotes (e.g., attributes['process.pid'])
 * - Mixed notation (e.g., body.metrics["requests.count"]['total'])
 *
 * It does *not* handle:
 * - Array indexing (e.g., attributes.list[0])
 * - More complex OTTL functions or syntax.
 *
 * @param pathString The OTTL-style field access string to parse.
 * @returns An array of strings representing the path segments. Returns an empty array for an empty input string.
 */
export function parsePath(pathString: string): string[] {
  const segments: string[] = [];
  if (!pathString) {
    return segments;
  }

  // Regular expression breakdown:
  // \.?                    // Optionally match a literal dot (for segments after the first)
  // ([^.\[]+)              // Capture Group 1: Match one or more characters that are NOT a dot or an opening bracket (dot notation segment)
  // |                      // OR
  // \[                     // Match a literal opening bracket '['
  // (['"])                // Capture Group 2: Match either a single (') or double (") quote.
  // (.*?)                  // Capture Group 3: Match any character (.), zero or more times (*), non-greedily (?). This is the content inside the quotes.
  // \2                     // Backreference to Capture Group 2: Match the same quote captured earlier (ensures matching quotes).
  // \]                     // Match a literal closing bracket ']'
  // g                      // Global flag: Find all matches, not just the first.
  const regex = /\.?([^.\[]+)|\[(['"])(.*?)\2\]/g;

  // Use matchAll for iterating through all matches found by the global regex
  for (const match of pathString.matchAll(regex)) {
    // If Capture Group 1 matched, it's a dot-separated segment (or the first segment)
    if (match[1]) {
      segments.push(match[1]);
    }
    // If Capture Group 3 matched, it's a bracketed segment.
    // Check for undefined because an empty string inside brackets (e.g., attributes[""]) is valid and results in match[3] being ""
    else if (match[3] !== undefined) {
      segments.push(match[3]);
    }
    // Ignore matches where neither group 1 nor group 3 has content (shouldn't happen with this regex and valid input, but good practice)
  }

  return segments;
}

export function normalizeForLucene(path: string) {
  return parsePath(path).join('.');
}
