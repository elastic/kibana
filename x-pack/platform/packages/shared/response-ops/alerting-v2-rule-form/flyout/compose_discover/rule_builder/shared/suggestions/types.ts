/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ExpressionSuggestionType = 'metric';

export interface ExpressionSuggestion {
  readonly type: ExpressionSuggestionType; // ToDo: check if this is really needed
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly cursorIndex?: number;
  readonly description?: string;
}

export interface SuggestionsProviderParams {
  readonly value: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

export type SuggestionsProvider = (
  params: SuggestionsProviderParams
) => readonly ExpressionSuggestion[];
