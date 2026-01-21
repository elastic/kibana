/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts a data source type to stack connector type format.
 * Stack connector types use a "." prefix (e.g., ".notion", ".github")
 *
 * @param type - The data source type (e.g., "notion", "github")
 * @returns The stack connector type with "." prefix (e.g., ".notion", ".github")
 * @throws Error if type is empty or invalid
 */
export function toStackConnectorType(type: string): string {
  if (!type || type.trim().length === 0) {
    throw new Error('Connector type cannot be empty');
  }

  // If already prefixed with ".", return as-is
  return type.startsWith('.') ? type : `.${type}`;
}
