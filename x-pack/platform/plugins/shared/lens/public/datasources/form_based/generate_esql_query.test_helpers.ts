/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Normalize ESQL string for test comparison.
 * query.print('wrapping') may output multi-line; composer may omit backticks for simple identifiers.
 */
export const normalizeEsql = (s: string): string => s.replace(/\s+/g, ' ').trim();
