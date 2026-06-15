/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Normalizes a column name to a valid placeholder identifier.
// Dots, hyphens, spaces, and other special characters (including @) are replaced with underscores;
// leading/trailing underscores are stripped.
// e.g. "category.keyword" → "category_keyword", "@timestamp" → "timestamp"
export const normalizeColumnName = (s: string): string =>
  s.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
