/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns the engine's message when `pattern` does not compile as a global regular expression
 * (the way every rule is evaluated), or `undefined` when it does. A pattern that does not compile
 * must never be saved: the pipeline would otherwise fail every request or skip the rule.
 */
export const getRegexPatternError = (pattern: string): string | undefined => {
  try {
    new RegExp(pattern, 'g');
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};
