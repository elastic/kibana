/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INLINE_ESQL_QUERY_REGEX } from './constants';

export function extractEsqlQueries(text: string): string[] {
  return Array.from(text.matchAll(INLINE_ESQL_QUERY_REGEX)).map((match) => match[1].trim());
}
