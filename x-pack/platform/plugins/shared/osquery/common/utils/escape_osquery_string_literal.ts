/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Escapes an arbitrary value for safe inclusion as a single-quoted SQL string
 * literal in an Osquery query.
 *
 * Osquery uses SQLite syntax, where a single quote inside a string literal is
 * escaped by doubling it (`'` -> `''`). The returned value is fully wrapped in
 * single quotes, so it can be dropped directly into a query, e.g.
 *
 *   `SELECT * FROM file WHERE directory = ${escapeOsqueryStringLiteral(path)}`
 *
 * The Files tab (and any other code interpolating user-supplied values such as
 * file-system paths into live-query SQL) MUST route those values through this
 * helper rather than raw string concatenation, to close the injection gap.
 */
export const escapeOsqueryStringLiteral = (value: string): string =>
  `'${String(value).replace(/'/g, "''")}'`;
