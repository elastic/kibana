/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  expandRanges,
  extractSourceContent,
  LineMapping,
  mergeRanges,
} from './composite_source_merger';

function asRanges(array: number[][]) {
  return array.map(v => {
    const [startLine, endLine] = v;
    return { startLine, endLine };
  });
}

test('expand lines to ranges', () => {
  const lines = asRanges([[1, 1], [3, 3], [5, 6]]);
  const expectedRanges = asRanges([[0, 4], [1, 6], [3, 9]]);
  expect(expandRanges(lines, 2)).toEqual(expectedRanges);
});

test('merge ranges', () => {
  const ranges = asRanges([[0, 3], [2, 5], [6, 7], [7, 10]]);
  const expectedRanges = asRanges([[0, 5], [6, 10]]);
  expect(mergeRanges(ranges)).toEqual(expectedRanges);
});

test('extract source by ranges', () => {
  const source = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const ranges = asRanges([[0, 3], [7, 11]]);
  const lineMappings = new LineMapping();
  const extracted = extractSourceContent(ranges, source, lineMappings);
  expect(extracted).toEqual(['0', '1', '2', '', '7', '8', '9', '10']);
  const expectedLineNumbers = ['1', '2', '3', '...', '8', '9', '10', '11'];
  expect(lineMappings.toStringArray('...')).toEqual(expectedLineNumbers);
  expect(lineMappings.lineNumber(7)).toBe(5);
  expect(lineMappings.lineNumber(0)).toBe(1);
});
