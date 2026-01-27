/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLMessage, EditorError } from '@kbn/esql-language';
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
        // Map absolute character offsets (min/max) to 1-based line/column positions
        if (min < 0 || max < 0 || max < min) return null;

        let absoluteIndex = 0; // start offset of the current line in the original string
        let start: { line: number; column: number } | null = null;
        let end: { line: number; column: number } | null = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineStart = absoluteIndex;
          const lineEndExclusive = lineStart + line.length; // without the newline

          // Determine start position: first line where min falls before the newline
          if (!start && min < lineEndExclusive) {
            start = { line: i, column: Math.max(1, min - lineStart + 1) };
          }

          // Determine end position: first line where max is <= line end
          if (!end && max <= lineEndExclusive) {
            end = { line: i, column: Math.max(1, max - lineStart + 1) };
          }

          absoluteIndex = lineEndExclusive + 1; // account for the removed \n
          if (start && end) break;
        }

        if (!start || !end) return null;

        return {
          message: error.text,
          startLineNumber: start.line + 1,
          startColumn: start.column,
          endLineNumber: end.line + 1,
          endColumn: end.column,
        };
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
    const numberedLines = lines.map((line, idx) => `${idx + 1}. ${line}`);

    const startLine = error.startLineNumber;
    const endLine = error.endLineNumber;

    const output: string[] = [];

    // Lines before the error span
    for (let ln = 1; ln < startLine; ln++) {
      output.push(numberedLines[ln - 1]);
    }

    // Error span: for each line, print the numbered line then caret underline
    for (let ln = startLine; ln <= endLine; ln++) {
      const content = lines[ln - 1] ?? '';
      const prefix = `${ln}. `;
      output.push(`${prefix}${content}`);

      const prefixLen = prefix.length;

      let caretStartInContent = 1; // 1-based column in content
      let caretWidth = 1;

      if (startLine === endLine) {
        caretStartInContent = Math.max(1, error.startColumn);
        caretWidth = Math.max(1, error.endColumn - error.startColumn);
      } else if (ln === startLine) {
        caretStartInContent = Math.max(1, error.startColumn);
        caretWidth = Math.max(1, content.length - caretStartInContent + 1);
      } else if (ln === endLine) {
        caretStartInContent = 1;
        caretWidth = Math.max(1, error.endColumn - 1);
      } else {
        caretStartInContent = 1;
        caretWidth = Math.max(1, content.length || 1);
      }

      const caretIndent = ' '.repeat(prefixLen + Math.max(0, caretStartInContent - 1));
      const caretMarks = '^'.repeat(caretWidth);
      output.push(`${caretIndent}${caretMarks}`);
    }

    // Error message directly after caret block
    output.push(`${error.message}`);

    // Remaining lines after the error span
    for (let ln = endLine + 1; ln <= lines.length; ln++) {
      output.push(numberedLines[ln - 1]);
    }

    return output.join('\n');
  });
}
