/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns true if the namespace is permitted by the given prefix list.
 * `null` means no restriction (anything is permitted).
 */
export function isNamespaceAllowedByPrefixes(
  namespace: string,
  prefixes: string[] | null
): boolean {
  if (prefixes === null) {
    return true;
  }
  return prefixes.some((prefix) => namespace.startsWith(prefix));
}
