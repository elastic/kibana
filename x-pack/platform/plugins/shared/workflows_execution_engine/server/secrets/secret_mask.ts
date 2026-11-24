/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** What replaces a secret value in everything a workflow run saves or shows. */
export const SECRET_MASK = '***';

/** Returns a `secrets` context where every name renders as the mask. */
export const maskSecrets = (names: readonly string[]): Record<string, string> =>
  Object.fromEntries(names.map((name) => [name, SECRET_MASK]));
