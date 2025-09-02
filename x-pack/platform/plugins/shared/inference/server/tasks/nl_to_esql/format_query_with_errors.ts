/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQLMessage, EditorError } from '@kbn/esql-ast';
import dedent from 'dedent';
import { compact } from 'lodash';

export function formatQueryWithErrors(
  formattedQuery: string,
  errors: (ESQLMessage | EditorError)[]
) {
  const lines = formattedQuery.split('\n');

  const errorsWithLineAndColumn = compact(
    errors.map((error) => {
      if ('location' in error) {
        const { min, max } = error.location;
        let charCount = 0;
        let start: { line: number; column: number } | null = null;
        let end: { line: number; column: number } | null = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const charIdx = charCount + line.length;

          // start is < the end of this line
          if (!start && charCount + charIdx >= min) {
            start = { line: i, column: min - charIdx };
          }

          // end is < the end of this line
          if (!end && charCount + charIdx >= max) {
            end = { line: i, column: max - charIdx };
          }

          charCount += lines[i].length + 1; // +1 for the \n that was removed by split
        }

        if (start !== null && end !== null) {
          return {
            message: error.text,
            startLineNumber: start.line + 1,
            startColumn: start.column,
            endLineNumber: end.line + 1,
            endColumn: end.column,
          };
        }

        return null;
      }

      return {
        message: error.message,
        startLineNumber: error.startLineNumber,
        endLineNumber: error.endLineNumber,
        startColumn: error.startColumn,
        endColumn: error.endColumn,
      };
    })
  );

  return errorsWithLineAndColumn.map((error) => {
    const linesWithErrors = lines
      .slice(error.startLineNumber, error.endLineNumber)
      .map((line, idx) => {
        const lineNumber = idx + error.startLineNumber + 1;
        const prefix = '>> ';

        return `${prefix}${lineNumber} ${line}`;
      });

    return dedent(`${error.message}
      ${linesWithErrors.join('\n')}
    `);
  });
}
