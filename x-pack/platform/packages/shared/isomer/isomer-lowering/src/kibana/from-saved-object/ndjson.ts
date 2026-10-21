/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Kibana's `POST /api/saved_objects/_export` returns newline-delimited JSON
// where every line is a saved-object envelope `{ type, id, attributes,
// references, ... }`, followed by a final summary line. This parser is
// lenient — empty lines, malformed JSON, and non-envelope objects (such
// as the trailing summary line) are silently skipped, and only valid
// envelopes are returned.

export interface SavedObjectEnvelope {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  references?: Array<{ id: string; type: string; name: string }> | undefined;
  migrationVersion?: Record<string, string> | undefined;
  coreMigrationVersion?: string | undefined;
  updated_at?: string | undefined;
}

const parseEnvelope = (value: unknown): SavedObjectEnvelope | undefined => {
  const parsed = SavedObjectEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

/**
 * Parse an NDJSON saved-object export into a list of envelopes. The trailing
 * summary line — `{ exportedCount, missingRefCount, ... }` — is silently
 * skipped because it has no `attributes` field.
 */
export const parseSavedObjectNdjson = (ndjson: string): SavedObjectEnvelope[] => {
  const lines = ndjson.split(/\r?\n/);
  const out: SavedObjectEnvelope[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const envelope = parseEnvelope(parsed);
    if (envelope) {
      out.push(envelope);
    }
  }
  return out;
};

/**
 * Find the first envelope matching a given type. Convenience for cases where
 * the caller knows there is exactly one Lens/Dashboard in the export.
 */
export const firstOfType = <T extends SavedObjectEnvelope>(
  envelopes: SavedObjectEnvelope[],
  type: string
): T | undefined => envelopes.find((env) => env.type === type) as T | undefined;
import { SavedObjectEnvelopeSchema } from './schema';
