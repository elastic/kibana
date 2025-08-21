/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition, pull } from 'lodash';
import { TOKEN_SPLIT_CHARS } from '../constants';
import { ALL_CAPTURE_CHARS } from '../constants';
import type { SingleLineColumn } from '../types';

/**
 * Analyzes columns of tokens across multiple lines to determine which split characters
 * are consistently used in each column. It returns a list of consistent split characters
 * for each column, including additional quote split characters.
 *
 * @param columnsPerLine - A 2D array where each row represents a line, and each column contains tokens.
 * @returns A 2D array where each entry corresponds to a column and contains the consistent split
 */
export function findConsistentSplitChars(columnsPerLine: SingleLineColumn[][]): string[][] {
  const splitTokenCountPerColumn: Array<Record<string, number>> = [];
  const consistentTokensPerColumn: string[][] = [];

  const [splitCharsToCheck, quoteSplitChars] = partition(
    TOKEN_SPLIT_CHARS,
    (token) => !ALL_CAPTURE_CHARS.includes(token)
  );

  columnsPerLine.forEach((columns) => {
    columns.forEach((column, idx) => {
      const counter: Record<string, number> = Object.fromEntries(
        splitCharsToCheck.map((token) => [token, 0])
      );

      column.tokens.forEach((token) => {
        if (splitCharsToCheck.includes(token.value)) {
          counter[token.value]++;
        }
      });

      if (!splitTokenCountPerColumn[idx]) {
        consistentTokensPerColumn[idx] = splitCharsToCheck.concat();
        splitTokenCountPerColumn[idx] = counter;
        return;
      }

      consistentTokensPerColumn[idx].forEach((splitToken) => {
        const countForThisRow = counter[splitToken];
        const previousCount = splitTokenCountPerColumn[idx][splitToken];

        if (countForThisRow !== previousCount) {
          pull(consistentTokensPerColumn[idx], splitToken);
        }
      });
    });
  });

  return consistentTokensPerColumn.map((tokens, idx) => {
    return splitCharsToCheck
      .filter((token) => {
        return tokens.includes(token);
      })
      .concat(quoteSplitChars);
  });
}
