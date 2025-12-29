/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Converts a data connector type to its corresponding connector spec ID.
 *
 * @param type - The data connector type (e.g., "notion", "github")
 * @returns The connector spec ID with "." prefix (e.g., ".notion", ".github")
 */
export function getConnectorSpecIdFromType(type: string): string {
  return `.${type}`;
}
