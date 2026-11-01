/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import type { ConfigEntry } from './serialize';
import { joinPointer, type FieldErrors } from './values';

// A JSON pointer into the submitted component: the config entry, optionally followed by a
// location inside its value, e.g. `/config/0` or `/config/0/value/2/action`.
const CONFIG_ENTRY_POINTER = /^\/config\/(\d+)(?:\/value(\/.*)?)?$/;

export interface DiagnosticFieldErrors {
  /** Errors keyed by form pointer, for the diagnostics that point at an editable field. */
  errors: FieldErrors;
  /** Diagnostics with no editable field to show them on. */
  unmatched: StreamsUnit.Diagnostic[];
}

/**
 * Places configuration service diagnostics on the form fields they point at. `config` is the
 * entries that were submitted, so `/config/<index>` resolves to the entry's name, which is the
 * form pointer; anything inside `value` keeps its relative pointer. Per-telemetry overrides are
 * not editable in the form, so their diagnostics stay unmatched.
 */
export const toFieldErrors = (
  diagnostics: readonly StreamsUnit.Diagnostic[],
  config: readonly ConfigEntry[]
): DiagnosticFieldErrors => {
  const errors: FieldErrors = {};
  const unmatched: StreamsUnit.Diagnostic[] = [];
  for (const diagnostic of diagnostics) {
    const match = diagnostic.path ? CONFIG_ENTRY_POINTER.exec(diagnostic.path) : null;
    const entry = match ? config[Number(match[1])] : undefined;
    const pointer = entry ? `${joinPointer('', entry.name)}${match?.[2] ?? ''}` : undefined;
    if (
      pointer === undefined ||
      entry?.telemetry !== undefined ||
      diagnostic.severity !== 'error' ||
      errors[pointer] !== undefined
    ) {
      unmatched.push(diagnostic);
      continue;
    }
    errors[pointer] = diagnostic.message;
  }
  return { errors, unmatched };
};
