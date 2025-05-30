/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PatternMatchTokenLiteral {
  type: 'literal';
  value: string;
}

export interface PatternMatchTokenCapture {
  type: 'capture';
  field: string;
}

export interface PatternMatchTokenCaptureSyntax {
  type: 'syntax';
  field?: string;
  syntax: string;
}

export type PatternMatchToken =
  | PatternMatchTokenLiteral
  | PatternMatchTokenCapture
  | PatternMatchTokenCaptureSyntax;

export type PatternMatchTokenResult = PatternMatchToken & {
  captured: string;
};

export interface PatternMatchFailure {
  pattern: string;
  message: string;
  matched: {
    tokens: PatternMatchTokenResult[];
    value: string;
  };
  unmatched: {
    tokens: PatternMatchToken[];
    value: string;
  };
}
