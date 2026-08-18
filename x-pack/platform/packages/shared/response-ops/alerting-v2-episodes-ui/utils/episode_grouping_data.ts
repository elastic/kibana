/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isPlainObject, isString } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/common';

/** Resolve a dot-path against nested objects or a single top-level key (e.g. flattened `host.name`). */
export const getValueByFieldPath = (data: Record<string, unknown>, field: string): unknown =>
  get(data, field);

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/** Recursively collect non-empty scalar leaves from arrays/objects, in traversal order. */
const collectScalarStrings = (value: unknown): string[] => {
  if (isScalar(value)) {
    const text = String(value);
    return text.trim() === '' ? [] : [text];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectScalarStrings);
  }
  if (isPlainObject(value)) {
    return Object.values(value as Record<string, unknown>).flatMap(collectScalarStrings);
  }
  return [];
};

/**
 * Fallback formatter used when no data view field metadata is available. Renders scalars directly
 * and flattens arrays/objects into a readable comma-separated list of their scalar leaves (rather
 * than dumping raw JSON, which is what made object-shaped values render as `{…}`).
 */
export const formatGroupingValueForDisplay = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (isScalar(value)) {
    return String(value);
  }
  return collectScalarStrings(value).join(', ');
};

/**
 * Formats a grouping value using the source data view's field metadata (via `fieldFormats`) when the field
 * is present in the data view, so typed fields (IP, date, number, …) render correctly. Falls back to
 * {@link formatGroupingValueForDisplay} when there is no data view, no matching field, or the formatter
 * yields an unusable result.
 */
export const formatGroupingValue = (
  field: string,
  rawValue: unknown,
  dataView?: DataView
): string => {
  if (rawValue === null || rawValue === undefined) {
    return '';
  }

  const dataViewField = dataView?.getFieldByName(field);
  if (dataView && dataViewField) {
    try {
      const formatted = dataView.getFormatterForField(dataViewField).convertToText(rawValue);
      if (
        typeof formatted === 'string' &&
        formatted.trim() !== '' &&
        formatted !== '[object Object]'
      ) {
        return formatted;
      }
    } catch {
      // fall through to the untyped fallback
    }
  }

  return formatGroupingValueForDisplay(rawValue);
};

/** Grouping fields whose formatted value is non-empty (whitespace-only counts as empty). */
export const getNonEmptyGroupingFields = (
  fields: readonly string[],
  data: Record<string, unknown>,
  dataView?: DataView
): string[] =>
  fields.filter(
    (field) => formatGroupingValue(field, getValueByFieldPath(data, field), dataView).trim() !== ''
  );

export const parseEpisodeDataJson = (raw: unknown): Record<string, unknown> => {
  if (!isString(raw) || raw.length === 0) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (isPlainObject(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore malformed JSON
  }
  return {};
};
