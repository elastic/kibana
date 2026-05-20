/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parsed form of an SML `origin_id` value.
 *
 * SML `origin_id`s either carry a resolver scheme prefix (`<scheme>://<path>`)
 * or are bare local identifiers without a scheme (backward-compat path for
 * SML types that compute their own permissions in `getSmlData`).
 */
export interface ParsedOriginId {
  /** The resolver type / URI scheme. `undefined` when the origin_id has no prefix. */
  scheme?: string;
  /** The part after `<scheme>://`. Equal to the input when no scheme is present. */
  path: string;
}

/**
 * Matches the URI scheme portion of a prefixed origin_id. Schemes are
 * lowercase alphanumeric with `_` / `-` separators and must start with a letter.
 *
 * The same shape is enforced for resolver `type` ids in the registry.
 */
const ORIGIN_ID_SCHEME_PATTERN = /^([a-z][a-z0-9_-]*):\/\/(.*)$/s;

/**
 * Parse an SML `origin_id` into its scheme + path components.
 *
 * Examples:
 *   parseOriginId('kibana://lens/abc-123')
 *     → { scheme: 'kibana', path: 'lens/abc-123' }
 *   parseOriginId('abc-123')
 *     → { scheme: undefined, path: 'abc-123' }
 */
export const parseOriginId = (originId: string): ParsedOriginId => {
  const match = ORIGIN_ID_SCHEME_PATTERN.exec(originId);
  if (!match) {
    return { path: originId };
  }
  return { scheme: match[1], path: match[2] };
};

/**
 * Build an `origin_id` from a resolver scheme + path. The scheme is validated
 * to match the same `[a-z][a-z0-9_-]*` shape used by the registry.
 */
export const formatOriginId = (scheme: string, path: string): string => {
  if (!/^[a-z][a-z0-9_-]*$/.test(scheme)) {
    throw new Error(`Invalid SML resolver scheme '${scheme}': must match /^[a-z][a-z0-9_-]*$/`);
  }
  return `${scheme}://${path}`;
};
