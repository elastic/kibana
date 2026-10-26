/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PatternSegment is a segment of the index pattern that is either a static text or a wildcard.
 * It is used to create the input groups.
 */
export interface PatternSegment {
  type: 'static' | 'wildcard';
  value: string;
  index?: number;
}

/**
 * Groups segments into input groups where each group has:
 * - prepend: static text before the wildcard (if any)
 * - wildcardIndex: the index of the wildcard
 * - append: static text after the wildcard (if any, and only if it's the last wildcard)
 */
export interface InputGroup {
  prepend?: string;
  wildcardIndex: number;
  append?: string;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Normalizes an index pattern by collapsing consecutive wildcards into a single wildcard.
 * For example, 'logs-**' becomes 'logs-*' and '**-logs-**' becomes '*-logs-*'.
 * This is because consecutive wildcards are functionally equivalent to a single wildcard.
 * @param pattern The index pattern to normalize.
 * @returns The normalized pattern.
 */
export const normalizePattern = (pattern: string): string => {
  if (!pattern) return pattern;
  // Replace consecutive wildcards with a single wildcard
  return pattern.replace(/\*+/g, '*');
};

/**
 * Parses the index pattern into a list of segments.
 * @param pattern The index pattern to parse.
 * @returns The list of segments.
 */
export const parseIndexPattern = (pattern: string): PatternSegment[] => {
  const normalizedPattern = normalizePattern(pattern);
  if (!normalizedPattern) return [];

  const segments: PatternSegment[] = [];
  let currentSegment = '';
  let wildcardIndex = 0;

  for (let i = 0; i < normalizedPattern.length; i++) {
    const char = normalizedPattern[i];
    if (char === '*') {
      if (currentSegment) {
        segments.push({ type: 'static', value: currentSegment });
        currentSegment = '';
      }
      segments.push({ type: 'wildcard', value: '*', index: wildcardIndex });
      wildcardIndex++;
    } else {
      currentSegment += char;
    }
  }

  if (currentSegment) {
    segments.push({ type: 'static', value: currentSegment });
  }

  return segments;
};

/**
 * Creates input groups from the segments.
 * @param segments The list of segments.
 * @returns The list of input groups.
 */
export const createInputGroups = (segments: PatternSegment[]): InputGroup[] => {
  const groups: InputGroup[] = [];
  let pendingPrepend: string | undefined;
  const wildcardCount = segments.filter((s) => s.type === 'wildcard').length;
  let currentWildcardNum = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    if (segment.type === 'static') {
      // Check if next segment is a wildcard
      const nextSegment = segments[i + 1];
      if (nextSegment?.type === 'wildcard') {
        // This static text becomes the prepend for the next wildcard
        pendingPrepend = segment.value;
      } else {
        // This is trailing static text - append to the last group
        if (groups.length > 0) {
          groups[groups.length - 1].append = segment.value;
        }
      }
    } else if (segment.type === 'wildcard') {
      currentWildcardNum++;
      groups.push({
        prepend: pendingPrepend,
        wildcardIndex: segment.index ?? 0,
        isFirst: currentWildcardNum === 1,
        isLast: currentWildcardNum === wildcardCount,
      });
      pendingPrepend = undefined;
    }
  }

  return groups;
};

/**
 * Counts the number of wildcards in the index pattern.
 * @param pattern The index pattern to count wildcards in.
 * @returns The number of wildcards.
 */
export const countWildcards = (pattern: string): number => {
  const normalizedPattern = normalizePattern(pattern);
  return (normalizedPattern.match(/\*/g) || []).length;
};

/**
 * Builds the stream name from the index pattern and the parts.
 * @param pattern The index pattern to build the stream name from.
 * @param parts The parts to build the stream name from.
 * @returns The stream name.
 */
export const buildStreamName = (pattern: string, parts: string[]): string => {
  if (!parts || parts.length === 0) {
    return pattern;
  }

  const normalizedPattern = normalizePattern(pattern);
  let partIndex = 0;

  return normalizedPattern.replace(/\*/g, () => {
    // Trim whitespace and keep * if the part is empty, so validation can detect unfilled wildcards
    const part = parts[partIndex]?.trim() || '*';
    partIndex++;
    return part;
  });
};
