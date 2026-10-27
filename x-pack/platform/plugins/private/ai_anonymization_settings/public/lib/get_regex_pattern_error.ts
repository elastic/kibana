/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RE2JS } from 're2js';

/**
 * Returns the engine's message when `pattern` is not valid RE2 syntax, or `undefined` when it is.
 * Custom rules run on RE2 (linear time, so no pattern can stall the pipeline), which has no
 * lookahead, lookbehind or backreferences. A pattern that does not compile must never be saved:
 * the pipeline would otherwise fail every request or skip the rule.
 */
export const getRegexPatternError = (pattern: string): string | undefined => {
  try {
    RE2JS.compile(pattern);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};
