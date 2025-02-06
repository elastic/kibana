/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { removeContentReferences } from './utils';

describe('utils', () => {
  it.each([
    ['this has no content references', 'this has no content references'],
    [
      'The sky is blue{reference(1234)} and the grass is green{reference(4321)}',
      'The sky is blue and the grass is green',
    ],
    ['', ''],
    ['{reference(1234)}', ''],
    [' {reference(1234)} ', '  '],
    ['{reference(1234', '{reference(1234'],
    ['{reference(1234)', '{reference(1234)'],
    ['{reference(1234)}{reference(1234)}{reference(1234)}', ''],
    ['{reference(1234)}reference(1234)}{reference(1234)}', 'reference(1234)}'],
  ])('removesContentReferences from "%s"', (input: string, expected: string) => {
    const result = removeContentReferences(input);

    expect(result).toEqual(expected);
  });

  // https://github.com/elastic/kibana/security/code-scanning/539
  it('removesContentReferences does not run in polynomial time', () => {
    const input = `${'{reference('.repeat(100000)}x${')'.repeat(100000)}`;
    const startTime = performance.now(); // Start timing

    removeContentReferences(input);

    const endTime = performance.now(); // End timing
    const executionTime = endTime - startTime; // Time in milliseconds

    expect(executionTime).toBeLessThan(1000); // Assert under 1 second
  });
});
