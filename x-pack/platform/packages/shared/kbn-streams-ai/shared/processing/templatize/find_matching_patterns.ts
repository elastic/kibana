/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GROK_REGEX_MAP } from './get_pattern_regex_map';
import { PATTERN_PRECEDENCE } from './pattern_precedence';

export function findMatchingPatterns(value: string): number[] {
  return PATTERN_PRECEDENCE.flatMap((pattern, idx) => {
    if (GROK_REGEX_MAP[pattern]?.complete.test(value)) {
      return [idx];
    }
    return [];
  });
}
