/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const DEFAULT_LINE_NUMBER_PLACEHOLDER = '..';

export interface LineRange {
  startLine: number;
  endLine: number;
}

/**
 * expand ranges of lines, eg:
 * expand 2 lines of [[3,4], [9,9]] with value 2 becomes [(1,7), (7,12)]
 * @param lines the array of line numbers
 * @param expand the expand range
 */
export function expandRanges(lines: LineRange[], expand: number): LineRange[] {
  return lines.map(line => ({
    startLine: Math.max(0, line.startLine - expand),
    endLine: line.endLine + expand + 1,
  }));
}

/**
 * merge the ranges that overlap each other into one, eg:
 * [(1,3), (2,5)] => [(1,5)]
 * @param ranges
 */
export function mergeRanges(ranges: LineRange[]): LineRange[] {
  const sortedRanges = ranges.sort((a, b) => a.startLine - b.startLine);
  const results: LineRange[] = [];

  const mergeIfOverlap = (a: LineRange, b: LineRange) => {
    // a <= b is always true here because sorting above
    if (b.startLine >= a.startLine && b.startLine <= a.endLine) {
      // overlap
      if (b.endLine > a.endLine) {
        a.endLine = b.endLine; // extend previous range
      }
      return true;
    }
    return false;
  };

  for (const range of sortedRanges) {
    if (results.length > 0) {
      const last = results[results.length - 1];
      if (mergeIfOverlap(last, range)) {
        continue;
      }
    }
    results.push(range);
  }
  return results;
}

/**
 * extract content from source by ranges
 * @param ranges the partials ranges of contents
 * @param source the source content
 * @param mapper a line mapper object which contains the relationship between source content and partial content
 * @return the extracted partial contents
 * #todo To support server side render for grammar highlights, we could change the source parameter to HighlightedCode[].
 * #todo interface HighlightedCode { text: string, highlights: ... };
 */
export function extractSourceContent(
  ranges: LineRange[],
  source: string[],
  mapper: LineMapping
): string[] {
  const sortedRanges = ranges.sort((a, b) => a.startLine - b.startLine);
  let results: string[] = [];
  const pushPlaceholder = () => {
    results.push('');
    mapper.addPlaceholder();
  };
  for (const range of sortedRanges) {
    if (!(results.length === 0 && range.startLine === 0)) {
      pushPlaceholder();
    }
    const slicedContent = source.slice(range.startLine, range.endLine);
    results = results.concat(slicedContent);
    mapper.addMapping(range.startLine, range.startLine + slicedContent.length);
  }
  const lastRange = sortedRanges[sortedRanges.length - 1];
  if (lastRange.endLine < source.length) {
    pushPlaceholder();
  }
  return results;
}

export class LineMapping {
  private lines: number[] = [];
  private reverseMap: Map<number, number> = new Map<number, number>();
  public toStringArray(
    placeHolder: string = DEFAULT_LINE_NUMBER_PLACEHOLDER,
    startAtLine: number = 1
  ): string[] {
    return this.lines.map(v => {
      if (Number.isNaN(v)) {
        return placeHolder;
      } else {
        return (v + startAtLine).toString();
      }
    });
  }
  public addPlaceholder() {
    this.lines.push(Number.NaN);
  }

  public addMapping(start: number, end: number) {
    for (let i = start; i < end; i++) {
      this.lines.push(i);
      this.reverseMap.set(i, this.lines.length - 1);
    }
  }

  public lineNumber(originLineNumber: number, startAtLine: number = 1) {
    const n = this.reverseMap.get(originLineNumber);
    if (n === undefined) {
      return Number.NaN;
    } else {
      return n + startAtLine;
    }
  }

  public hasLine(line: number) {
    return this.reverseMap.has(line);
  }
}
