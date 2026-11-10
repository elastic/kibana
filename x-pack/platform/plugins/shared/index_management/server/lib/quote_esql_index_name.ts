/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Wraps an index name in double quotes so it is parsed as a single ES|QL index source. */
export const quoteEsqlIndexName = (indexName: string): string =>
  `"${indexName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
