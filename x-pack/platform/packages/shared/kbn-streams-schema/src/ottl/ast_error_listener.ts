/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Recognizer, RecognitionException } from 'antlr4';
import { ErrorListener } from 'antlr4';

// These will need to be manually updated whenever the relevant grammar changes.
export class OTTLErrorListener extends ErrorListener<any> {
  protected errors: Error[] = [];

  syntaxError(
    recognizer: Recognizer<any>,
    offendingSymbol: any,
    line: number,
    column: number,
    message: string,
    error: RecognitionException | undefined
  ): void {
    const textMessage = `SyntaxError: ${message}`;

    // const tokenPosition = getPosition(offendingSymbol);
    // const startColumn = offendingSymbol && tokenPosition ? tokenPosition.min + 1 : column + 1;
    // const endColumn = offendingSymbol && tokenPosition ? tokenPosition.max + 1 : column + 2;

    this.errors.push({
      // startLineNumber: line,
      // endLineNumber: line,
      // startColumn,
      // endColumn,
      name: 'SyntaxError',
      message: textMessage,
      // severity: 'error',
    });
  }

  getErrors(): Error[] {
    return this.errors;
  }
}
