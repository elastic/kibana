/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A segment in a parsed JSON path. Either a key (object field name) or an index (array position).
 */
export type JsonPathSegment = { type: 'key'; name: string } | { type: 'index'; index: number };

/**
 * Result of parsing a JSON path.
 */
export interface ParsedJsonPath {
  segments: JsonPathSegment[];
  originalPath: string;
}

/**
 * Error thrown when a JSON path is malformed.
 */
export class JsonPathParseError extends Error {
  constructor(
    public readonly path: string,
    public readonly reason: string,
    public readonly position?: number
  ) {
    const positionSuffix = position !== undefined ? ` at position ${position}` : '';
    super(`Invalid JSON path [${path}]: ${reason}${positionSuffix}`);
    this.name = 'JsonPathParseError';
  }
}

/**
 * Characters used by the parser.
 */
const DOLLAR = '$';
const DOT = '.';
const OPEN_BRACKET = '[';
const CLOSE_BRACKET = ']';
const BACKSLASH = '\\';
const SINGLE_QUOTE = "'";
const DOUBLE_QUOTE = '"';

/**
 * Returns true if the character is whitespace per RFC 9535:
 * space (%x20), horizontal tab (%x09), newline (%x0A), or carriage return (%x0D).
 */
function isBlank(c: string): boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r';
}

/**
 * Skips optional blank space starting at pos.
 */
function skipBlankSpace(path: string, pos: number): number {
  while (pos < path.length && isBlank(path[pos])) {
    pos++;
  }
  return pos;
}

/**
 * Normalizes the path by stripping the optional $ prefix.
 * Returns null if the path represents the root accessor (empty path or bare $).
 */
function normalizePath(
  path: string,
  originalPath: string,
  errorPositionOffset: number
): string | null {
  if (path.length === 0 || (path[0] === DOLLAR && path.length === 1)) {
    return null;
  }

  if (path.length >= 2 && path[0] === DOLLAR) {
    const second = path[1];
    if (second === DOT) {
      path = path.slice(2);
    } else if (second === OPEN_BRACKET) {
      path = path.slice(1);
    } else {
      throw new JsonPathParseError(
        originalPath,
        'expected [.] or [[] after [$]',
        errorPositionOffset + 1
      );
    }
  }

  return path.length === 0 ? null : path;
}

/**
 * Characters that are not allowed in bare keys (unsupported JSONPath features).
 */
const INVALID_KEY_CHARS = ['*', '?', ':', '@', '!', '&', '|', '(', ')', ','];

/**
 * Reads a bare key using dot notation until a delimiter is found.
 * Validates that keys don't contain unsupported characters like wildcards.
 */
function readKey(
  path: string,
  originalPath: string,
  start: number,
  baseOffset: number,
  segments: JsonPathSegment[]
): number {
  let end = start;
  while (end < path.length) {
    const c = path[end];
    if (c === DOT || c === OPEN_BRACKET || c === CLOSE_BRACKET) {
      break;
    }
    if (INVALID_KEY_CHARS.includes(c)) {
      throw new JsonPathParseError(
        originalPath,
        `unsupported character [${c}] in key name`,
        baseOffset + end
      );
    }
    end++;
  }

  if (end === start) {
    throw new JsonPathParseError(originalPath, 'empty key name', baseOffset + start);
  }

  segments.push({ type: 'key', name: path.slice(start, end) });
  return end;
}

/**
 * Reads a quoted key inside brackets, handling escape sequences.
 */
function readQuotedKey(
  path: string,
  originalPath: string,
  pos: number,
  bracketOffset: number,
  segments: JsonPathSegment[]
): number {
  const quote = path[pos];
  pos++;
  let key = '';

  while (pos < path.length) {
    const c = path[pos];

    if (c === BACKSLASH && pos + 1 < path.length) {
      key += path[pos + 1];
      pos += 2;
    } else if (c === quote) {
      const afterQuote = skipBlankSpace(path, pos + 1);
      if (afterQuote >= path.length || path[afterQuote] !== CLOSE_BRACKET) {
        throw new JsonPathParseError(
          originalPath,
          'expected closing bracket after quoted key',
          bracketOffset
        );
      }
      segments.push({ type: 'key', name: key });
      return afterQuote + 1;
    } else {
      key += c;
      pos++;
    }
  }

  throw new JsonPathParseError(originalPath, 'unterminated quoted key', bracketOffset);
}

/**
 * Reads a numeric array index inside brackets.
 */
function readIndex(
  path: string,
  originalPath: string,
  pos: number,
  bracketOffset: number,
  segments: JsonPathSegment[]
): number {
  const end = path.indexOf(CLOSE_BRACKET, pos);
  if (end === -1) {
    throw new JsonPathParseError(
      originalPath,
      'missing closing bracket for array index',
      bracketOffset
    );
  }

  let contentEnd = end;
  while (contentEnd > pos && isBlank(path[contentEnd - 1])) {
    contentEnd--;
  }

  const content = path.slice(pos, contentEnd);
  if (content.length === 0) {
    throw new JsonPathParseError(originalPath, 'empty array index', bracketOffset);
  }

  const index = parseInt(content, 10);
  if (isNaN(index) || !/^\d+$/.test(content)) {
    throw new JsonPathParseError(
      originalPath,
      `expected integer array index, got [${content}]`,
      bracketOffset
    );
  }

  if (content.length > 1 && content[0] === '0') {
    throw new JsonPathParseError(
      originalPath,
      `leading zeros are not allowed in array index [${content}]`,
      bracketOffset
    );
  }

  if (index < 0) {
    throw new JsonPathParseError(originalPath, 'array index out of bounds', bracketOffset);
  }

  segments.push({ type: 'index', index });
  return end + 1;
}

/**
 * Dispatches bracket content to the appropriate reader.
 */
function readBracket(
  path: string,
  originalPath: string,
  pos: number,
  bracketOffset: number,
  segments: JsonPathSegment[]
): number {
  pos = skipBlankSpace(path, pos);

  if (pos >= path.length) {
    throw new JsonPathParseError(originalPath, 'unterminated bracket', bracketOffset);
  }

  const c = path[pos];
  if (c === SINGLE_QUOTE || c === DOUBLE_QUOTE) {
    return readQuotedKey(path, originalPath, pos, bracketOffset, segments);
  } else if (c === CLOSE_BRACKET) {
    throw new JsonPathParseError(originalPath, 'empty brackets', bracketOffset);
  } else {
    return readIndex(path, originalPath, pos, bracketOffset, segments);
  }
}

/**
 * Internal parsing implementation.
 */
function doParse(path: string, errorPositionOffset: number): JsonPathSegment[] {
  const originalPath = path;
  const segments: JsonPathSegment[] = [];

  let dollarPrefixLength = 0;
  if (path.startsWith('$.')) {
    dollarPrefixLength = 2;
  } else if (path.startsWith('$[')) {
    dollarPrefixLength = 1;
  } else if (path === '$') {
    dollarPrefixLength = 1;
  }

  const normalized = normalizePath(path, originalPath, errorPositionOffset);
  if (normalized === null) {
    return segments;
  }

  path = normalized;
  const baseOffset = errorPositionOffset + dollarPrefixLength;

  let pos = 0;

  if (path[0] === DOT) {
    throw new JsonPathParseError(originalPath, 'path cannot start with a dot', baseOffset);
  }

  while (pos < path.length) {
    const c = path[pos];

    if (c === DOT) {
      pos++;
      if (pos >= path.length) {
        throw new JsonPathParseError(
          originalPath,
          'path cannot end with a dot',
          baseOffset + pos - 1
        );
      }
      if (path[pos] === DOT) {
        throw new JsonPathParseError(originalPath, 'consecutive dots', baseOffset + pos - 1);
      }
      if (path[pos] === OPEN_BRACKET) {
        continue;
      }
      pos = readKey(path, originalPath, pos, baseOffset, segments);
    } else if (c === OPEN_BRACKET) {
      const bracketOffset = baseOffset + pos;
      pos++;
      pos = readBracket(path, originalPath, pos, bracketOffset, segments);
    } else {
      pos = readKey(path, originalPath, pos, baseOffset, segments);
    }
  }

  return segments;
}

/**
 * Parses a JSON path string into typed segments.
 *
 * This implementation follows a subset of JSONPath (RFC 9535) syntax:
 * - Dot notation: user.address.city
 * - Bracket notation for array indices: items[0]
 * - Quoted bracket notation for special keys: ['user.name'], ["key with spaces"]
 * - Optional $ root selector: $.name and name are equivalent
 * - Mixed notation: $.store['items'][0].name
 * - Escape sequences in quoted keys: \', \", \\
 * - Optional whitespace inside brackets: [ 0 ], [ 'key' ]
 *
 * @param path - The JSON path string to parse
 * @param errorPositionOffset - Optional offset for error positions (useful when path comes from a larger query)
 * @throws {JsonPathParseError} If the path is malformed
 */
export function parseJsonPath(path: string, errorPositionOffset = 0): ParsedJsonPath {
  const trimmed = path.trim();
  return {
    segments: doParse(trimmed, errorPositionOffset),
    originalPath: trimmed,
  };
}

/**
 * Converts parsed segments to a simple string array for backward compatibility.
 * Keys become their names, indices become their string representation.
 */
export function segmentsToStrings(segments: JsonPathSegment[]): string[] {
  return segments.map((seg) => (seg.type === 'key' ? seg.name : String(seg.index)));
}

/**
 * Validates a JSON path without returning the full parsed result.
 * Throws JsonPathParseError if the path is invalid.
 */
export function validateJsonPath(path: string, errorPositionOffset = 0): void {
  parseJsonPath(path, errorPositionOffset);
}
