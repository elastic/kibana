/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fallback deadline for `getSampleDocumentsEsql` / `getDiverseSampleDocuments` /
 * `getEsqlColumnSchema` callers with no better-informed timing budget of their
 * own. Callers with a real deadline should derive their own signal instead.
 */
export const DEFAULT_ESQL_QUERY_TIMEOUT_MS = 30_000;
