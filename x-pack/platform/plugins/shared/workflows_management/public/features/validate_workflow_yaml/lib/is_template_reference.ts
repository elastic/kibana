/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns true if the value looks like a template expression that should
 * be skipped by selection/UUID validation (e.g. connector-id, custom properties
 * with selection handlers). Covers both variable references (${{ ... }})
 * and Liquid output ({{ ... }}).
 */
export function isTemplateReference(value: string | null | undefined): boolean {
  if (value == null || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return (
    (trimmed.startsWith('${{') && trimmed.endsWith('}}')) ||
    (trimmed.startsWith('{{') && trimmed.endsWith('}}'))
  );
}
