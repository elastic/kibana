/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type StateValue = string | number | boolean;

/** The only reference form text may contain: `{{state.<key>}}`. */
const REFERENCE_PATTERN = /\{\{\s*state\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

/** Names of the state keys a text refers to. */
export const findStateReferences = (text: string): string[] =>
  Array.from(text.matchAll(REFERENCE_PATTERN), ([, key]) => key);

/** True when the text holds a `{{` that is not a valid state reference. */
export const hasMalformedReference = (text: string): boolean =>
  text.replace(REFERENCE_PATTERN, '').includes('{{');

/**
 * Replaces each `{{state.key}}` with the key's current value as plain text. A key with no value
 * is replaced with nothing.
 */
export const interpolate = (text: string, state: Readonly<Record<string, StateValue>>): string =>
  text.replace(REFERENCE_PATTERN, (_match, key: string) => String(state[key] ?? ''));
