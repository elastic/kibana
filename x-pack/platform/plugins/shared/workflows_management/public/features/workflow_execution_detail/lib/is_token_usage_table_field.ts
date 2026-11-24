/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Flattened field-path prefix for LangChain / AI step token metadata. */
export const TOKEN_USAGE_TABLE_FIELD_PREFIX = 'metadata.tokenUsage.';

/**
 * True when a flattened Output-table field path is AI token usage that should
 * be omitted from the table view (the AI section owns that presentation).
 */
export const isTokenUsageTableField = (fieldPath: string): boolean =>
  fieldPath === 'metadata.tokenUsage' || fieldPath.startsWith(TOKEN_USAGE_TABLE_FIELD_PREFIX);
