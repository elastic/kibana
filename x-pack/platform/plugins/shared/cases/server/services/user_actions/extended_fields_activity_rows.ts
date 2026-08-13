/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * How many Activity timeline rows a single extended_fields user action renders as.
 * Matches the public builder in `public/components/user_actions/extended_fields.tsx`:
 * one row per field key, or a single fallback row when empty.
 */
export const getExtendedFieldsActivityRowCount = (
  extendedFields: Record<string, unknown> | null | undefined
): number => {
  if (
    extendedFields == null ||
    typeof extendedFields !== 'object' ||
    Array.isArray(extendedFields)
  ) {
    return 1;
  }

  const keyCount = Object.keys(extendedFields).length;
  return keyCount > 0 ? keyCount : 1;
};
