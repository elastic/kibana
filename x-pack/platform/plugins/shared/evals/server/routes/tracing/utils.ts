/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Escapes Elasticsearch wildcard metacharacters (`\`, `*`, `?`) in user input
 * so the literal characters are matched rather than interpreted as wildcards.
 */
export const escapeWildcard = (input: string): string =>
  input.replace(/[\\\*\?]/g, (ch) => `\\${ch}`);
