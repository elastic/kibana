/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hardenStoredVegaSpec } from './normalize_spec';

export type SanitizePanelVegaSpecResult =
  | { ok: true; spec: string }
  | { ok: false; message: string };

const DOUBLE_ENCODED_HINT = /\\n|\\"/;

/**
 * Agents packing an already-serialized `visualization.spec` into
 * `generate_dashboard` `source: "config"` often JSON-encode the string a second
 * time (literal `\n` / `\"` in the field value). Detect and unwrap one layer.
 */
const unwrapDoubleEncodedJsonString = (spec: string): string | undefined => {
  // Real JSON objects from create_visualization contain newlines; skip those.
  if (spec.includes('\n') || !DOUBLE_ENCODED_HINT.test(spec)) {
    return undefined;
  }
  try {
    const unwrapped = JSON.parse(`"${spec}"`);
    return typeof unwrapped === 'string' ? unwrapped : undefined;
  } catch {
    return undefined;
  }
};

const parseSpecObject = (spec: string): Record<string, unknown> | undefined => {
  try {
    const parsed = JSON.parse(spec);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // try heal below
  }
  return undefined;
};

/**
 * Validate and harden a by-value Vega panel `config.spec` string:
 * - require a JSON object (Vega / Vega-Lite)
 * - heal one layer of accidental double-encoding from tool-call packing
 * - run {@link hardenStoredVegaSpec} (layout strip, color/Sankey fixes,
 *   expression rewrite, field escaping) without rebinding ES|QL data urls
 *
 * Does not re-run the headless Vega validator (that already ran in
 * create_visualization). Returns a stable serialized object for panel storage.
 */
export const sanitizePanelVegaSpec = (spec: string): SanitizePanelVegaSpecResult => {
  let candidate = spec;
  let parsed = parseSpecObject(candidate);

  if (!parsed) {
    const unwrapped = unwrapDoubleEncodedJsonString(candidate);
    if (unwrapped) {
      candidate = unwrapped;
      parsed = parseSpecObject(candidate);
    }
  }

  if (!parsed) {
    return {
      ok: false,
      message:
        'Vega panel `spec` must be a JSON object string. Copy `visualization.spec` verbatim from create_visualization or attachments.read — do not re-stringify or double-encode it.',
    };
  }

  const hardened = hardenStoredVegaSpec(parsed);
  return { ok: true, spec: JSON.stringify(hardened) };
};
