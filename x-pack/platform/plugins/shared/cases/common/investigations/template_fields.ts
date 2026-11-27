/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldValue } from './types';

/** Tag that marks a Cases template as an investigation type. */
export const INVESTIGATION_TYPE_TEMPLATE_TAG = 'investigation-type';

const NUMBER_TYPES_LONG = new Set(['long', 'integer', 'short', 'byte', 'unsigned_long']);
const NUMBER_TYPES_DOUBLE = new Set(['double', 'float', 'half_float', 'scaled_float']);

/** `<name>_as_<type>` (the case `extended_fields` key) split back into its parts. */
export const parseExtendedFieldKey = (key: string): { name: string; type: string } | null => {
  const idx = key.lastIndexOf('_as_');
  if (idx <= 0) return null;
  return { name: key.slice(0, idx), type: key.slice(idx + 4) };
};

/** Suffix of the typed mirror key on the investigation record (`fields.<name>_<suffix>`). */
export const getMirrorSuffix = (type: string, control?: string | null): string => {
  if (control === 'TOGGLE' || type === 'boolean') return 'bool';
  if (control === 'DATE_PICKER' || type === 'date') return 'date';
  if (NUMBER_TYPES_LONG.has(type)) return 'long';
  if (NUMBER_TYPES_DOUBLE.has(type)) return 'double';
  if (control === 'TEXTAREA') return 'text';
  return 'keyword';
};

export const getMirrorKey = (name: string, type: string, control?: string | null): string =>
  `${name}_${getMirrorSuffix(type, control)}`;

/**
 * Converts a case `extended_fields` string value into the typed value stored in the record
 * mirror. Multi-value controls (checkbox group, user picker) become string arrays; user picker
 * values keep the display names.
 */
export const toMirrorValue = (raw: string, type: string, control?: string | null): FieldValue => {
  if (raw === '' || raw === undefined || raw === null) return null;
  const suffix = getMirrorSuffix(type, control);
  if (control === 'CHECKBOX_GROUP' || control === 'USER_PICKER') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => (typeof v === 'string' ? v : v?.name ?? v?.uid ?? ''))
          .filter((v: string) => v.length > 0);
      }
    } catch {
      return [raw];
    }
    return null;
  }
  if (suffix === 'bool') return raw === 'true';
  if (suffix === 'long' || suffix === 'double') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return raw;
};

/** Builds the record mirror from a case's `extended_fields` and `extended_fields_controls`. */
export const buildFieldsMirror = (
  extendedFields: Record<string, string> | null | undefined,
  controls: Record<string, string> | null | undefined
): Record<string, FieldValue> => {
  const out: Record<string, FieldValue> = {};
  for (const [key, raw] of Object.entries(extendedFields ?? {})) {
    const parsed = parseExtendedFieldKey(key);
    if (parsed) {
      const control = controls?.[key];
      out[getMirrorKey(parsed.name, parsed.type, control)] = toMirrorValue(
        raw,
        parsed.type,
        control
      );
    }
  }
  return out;
};

export interface CaseFieldError {
  /** Field label as written by Cases ("Field "<label>" ..."), or null when Cases did not name it. */
  label: string | null;
  message: string;
}

/**
 * Splits a Cases validation message ("Invalid extended_fields: a; b" or "Cannot close case x,
 * required fields must be filled: a; b") into per-field errors so the UI can show each one at
 * its field.
 */
export const parseCaseFieldErrors = (message: string): CaseFieldError[] => {
  const markers = ['Invalid extended_fields: ', 'required fields must be filled: '];
  const marker = markers.find((m) => message.includes(m));
  if (!marker) return [];
  const body = message.slice(message.indexOf(marker) + marker.length);
  return body
    .split('; ')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = /Field "([^"]+)"/.exec(part);
      return { label: match ? match[1] : null, message: part };
    });
};
