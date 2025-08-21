/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamedToken } from '../types';
import { sanitize } from './get_review_fields';

/*
 * Constructs a Grok pattern string by iterating over an array of NamedToken objects.
 */
export function getGrokPattern(tokens: NamedToken[]) {
  return tokens.reduce((acc, token) => {
    return acc + (token.id ? `%{${token.pattern}:${token.id}}` : sanitize(token.pattern));
  }, '');
}
