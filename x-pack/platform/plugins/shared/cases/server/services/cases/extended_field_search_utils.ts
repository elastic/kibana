/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { CASE_SAVED_OBJECT, CASE_EXTENDED_FIELDS } from '../../../common/constants';
import type { Template } from '../../../common/types/domain/template/v1';

export interface ExtendedFieldFilter {
  label: string;
  value: string;
}

export interface ResolvedExtendedFieldFilter {
  storageKey: string;
  value: string;
  esType: string;
  control: string;
}

type RuntimeType = 'keyword' | 'long' | 'double' | 'date';

const ES_TYPE_TO_RUNTIME_TYPE: Record<string, RuntimeType> = {
  keyword: 'keyword',
  long: 'long',
  integer: 'long',
  short: 'long',
  byte: 'long',
  unsigned_long: 'long',
  double: 'double',
  float: 'double',
  half_float: 'double',
  scaled_float: 'double',
  date: 'date',
};

const mapToRuntimeType = (esType: string): RuntimeType =>
  ES_TYPE_TO_RUNTIME_TYPE[esType] ?? 'keyword';

const CHECKBOX_GROUP = 'CHECKBOX_GROUP';
const USER_PICKER = 'USER_PICKER';
const DATE_PICKER = 'DATE_PICKER';

// Flattened fields require params._source access; doc[] is always empty for subfields.
const buildPainlessScript = (
  storageKey: string,
  runtimeType: RuntimeType,
  control: string
): string => {
  const soType = `'${CASE_SAVED_OBJECT}'`;
  const efKey = `'${CASE_EXTENDED_FIELDS}'`;
  const fieldKey = `'${storageKey}'`;

  const readRaw =
    `if (params._source == null) { return; }` +
    `def so = params._source.get(${soType});` +
    `if (so == null) { return; }` +
    `def ef = so.get(${efKey});` +
    `if (ef == null) { return; }` +
    `def rawVal = ef.get(${fieldKey});` +
    `if (rawVal == null) { return; }` +
    `def raw = rawVal.toString();`;

  // Strip JSON array punctuation, split on comma, emit each trimmed token.
  const splitArrayScript =
    `def cleaned = /[\\[\\]"]/.matcher(raw).replaceAll('').trim();` +
    `def arr = /,/.split(cleaned);` +
    `for (def item : arr) { if (!item.trim().isEmpty()) { emit(item.trim()); } }`;

  if (control === USER_PICKER) {
    // Values are stored as '[{"uid":"...","name":"..."}]'; extract only the name via regex.
    return (
      `${readRaw}` +
      `def m = /"name":"([^"]*)"/.matcher(raw);` +
      `while (m.find()) { emit(m.group(1)); }`
    );
  }

  if (control === DATE_PICKER) {
    // Emit the raw ISO string as keyword; the query layer uses a range query for date matching.
    return `${readRaw}emit(raw);`;
  }

  if (control === CHECKBOX_GROUP) {
    return `${readRaw}${splitArrayScript}`;
  }

  // Auto-detect JSON arrays for keyword fields (e.g. legacy templates without a control type).
  if (runtimeType === 'keyword') {
    return `${readRaw}if (raw.startsWith('[')) { ${splitArrayScript} } else { emit(raw); }`;
  }

  switch (runtimeType) {
    case 'long':
      return `${readRaw} emit(Long.parseLong(raw));`;
    case 'double':
      return `${readRaw} emit(Double.parseDouble(raw));`;
    default:
      return `${readRaw} emit(raw);`;
  }
};

/**
 * Resolves user-typed label:value filters against template field metadata
 * to produce storage keys and ES types for query construction.
 */
export const resolveExtendedFieldFilters = (
  extendedFieldFilters: ExtendedFieldFilter[],
  templates: Array<Pick<Template, 'fieldNames'>>
): ResolvedExtendedFieldFilter[] => {
  const labelToMeta = new Map<string, { storageKey: string; esType: string; control: string }>();

  for (const template of templates) {
    for (const field of template.fieldNames ?? []) {
      labelToMeta.set(field.label.toLowerCase(), {
        storageKey: `${field.name}_as_${field.type}`,
        esType: field.type,
        control: field.control,
      });
    }
  }

  return extendedFieldFilters
    .map(({ label, value }) => {
      const meta = labelToMeta.get(label.toLowerCase());
      return meta
        ? { storageKey: meta.storageKey, value, esType: meta.esType, control: meta.control }
        : null;
    })
    .filter((f): f is ResolvedExtendedFieldFilter => f !== null);
};

/** Parses a date string (MM/DD/YYYY, YYYY-MM-DD, or ISO 8601) into a full-day UTC range [gte, lt). */
export const parseDateFilterToRange = (value: string): { gte: string; lt: string } | undefined => {
  let year: number;
  let month: number;
  let day: number;

  const mdyMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mdyMatch) {
    month = parseInt(mdyMatch[1], 10);
    day = parseInt(mdyMatch[2], 10);
    year = parseInt(mdyMatch[3], 10);
  } else {
    const isoPart = value.slice(0, 10);
    const isoMatch = isoPart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!isoMatch) return undefined;
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  }

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1000 || year > 9999) {
    return undefined;
  }

  const start = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(start.getTime())) return undefined;

  const end = new Date(start.getTime() + 86_400_000);
  return { gte: start.toISOString(), lt: end.toISOString() };
};

/** Builds ES runtime field mappings for each resolved extended field filter. */
export const buildExtendedFieldRuntimeMappings = (
  resolvedFilters: ResolvedExtendedFieldFilter[]
): Record<string, estypes.MappingRuntimeField> => {
  const runtimeMappings: Record<string, estypes.MappingRuntimeField> = {};

  for (const { storageKey, esType, control } of resolvedFilters) {
    // DATE_PICKER emits a raw ISO string, so use keyword (not date) to avoid epoch-ms conversion.
    const runtimeType = control === DATE_PICKER ? 'keyword' : mapToRuntimeType(esType);
    runtimeMappings[`ef_${storageKey}`] = {
      type: runtimeType,
      script: {
        source: buildPainlessScript(storageKey, runtimeType, control),
      },
    };
  }

  return runtimeMappings;
};

/** Builds filter clauses for each resolved extended field filter (range for dates, term otherwise). */
export const buildExtendedFieldFilterClauses = (
  resolvedFilters: ResolvedExtendedFieldFilter[]
): estypes.QueryDslQueryContainer[] =>
  resolvedFilters.flatMap(
    ({ storageKey, value, esType, control }): estypes.QueryDslQueryContainer[] => {
      const fieldName = `ef_${storageKey}`;

      if (control === DATE_PICKER) {
        const range = parseDateFilterToRange(value);
        return range ? [{ range: { [fieldName]: range } }] : [];
      }

      const runtimeType = mapToRuntimeType(esType);
      const typedValue = runtimeType === 'long' ? Number(value) : value;
      return [{ term: { [fieldName]: { value: typedValue } } }];
    }
  );
