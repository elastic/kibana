/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parses the `data_json` column produced by `JSON_EXTRACT(_source, "$.data")`
 * in the alert-event ES|QL queries. Defensive on purpose: malformed JSON,
 * non-object roots, and missing values all collapse to an empty object so the
 * synthetic `.rule-events` doc builder never receives a non-object value.
 */
export const parseDataJson = (
  raw: string | Record<string, unknown> | null | undefined
): Record<string, unknown> => {
  if (raw === null || raw === undefined) {
    return {};
  }
  if (typeof raw === 'object') {
    return Array.isArray(raw) ? {} : raw;
  }
  if (raw.length === 0) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed JSON — fall through to empty data.
  }
  return {};
};
