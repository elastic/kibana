/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Recognizer, RecognitionException } from 'antlr4';
import { ErrorListener } from 'antlr4';

import type { AgentConditionSyntaxError } from './validate';

export class CollectingErrorListener extends ErrorListener<unknown> {
  private readonly errors: AgentConditionSyntaxError[] = [];

  syntaxError(
    _recognizer: Recognizer<unknown>,
    _offendingSymbol: unknown,
    line: number,
    column: number,
    message: string,
    _error: RecognitionException | undefined
  ): void {
    this.errors.push({ line, column, message });
  }

  getErrors(): AgentConditionSyntaxError[] {
    return this.errors;
  }
}
