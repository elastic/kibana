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
  templateIds: string[];
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

export const resolveExtendedFieldFilters = (
  extendedFieldFilters: ExtendedFieldFilter[],
  templates: Array<Pick<Template, 'fieldNames' | 'templateId'>>
): ResolvedExtendedFieldFilter[][] => {
  // labelKey → storageKey → { meta, templateIds[] }
  const labelToMetas = new Map<
    string,
    Map<string, { storageKey: string; esType: string; control: string; templateIds: string[] }>
  >();

  for (const template of templates) {
    for (const field of template.fieldNames ?? []) {
      const labelKey = field.label.toLowerCase();
      const storageKey = `${field.name}_as_${field.type}`;

      let byStorageKey = labelToMetas.get(labelKey);
      if (byStorageKey == null) {
        byStorageKey = new Map();
        labelToMetas.set(labelKey, byStorageKey);
      }

      let entry = byStorageKey.get(storageKey);
      if (entry == null) {
        entry = {
          storageKey,
          esType: field.type,
          control: field.control,
          templateIds: [],
        };
        byStorageKey.set(storageKey, entry);
      }

      entry.templateIds.push(template.templateId);
    }
  }

  return extendedFieldFilters.flatMap(({ label, value }) => {
    const metas = labelToMetas.get(label.toLowerCase());
    if (metas == null) return [];
    const group = [...metas.values()].map((meta) => ({
      storageKey: meta.storageKey,
      value,
      esType: meta.esType,
      control: meta.control,
      templateIds: meta.templateIds,
    }));
    return group.length > 0 ? [group] : [];
  });
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

/** Builds ES runtime field mappings for each resolved extended field filter group. */
export const buildExtendedFieldRuntimeMappings = (
  resolvedFilterGroups: ResolvedExtendedFieldFilter[][]
): Record<string, estypes.MappingRuntimeField> => {
  const runtimeMappings: Record<string, estypes.MappingRuntimeField> = {};

  for (const { storageKey, esType, control } of resolvedFilterGroups.flat()) {
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

const buildSingleFilterClause = ({
  storageKey,
  value,
  esType,
  control,
  templateIds,
}: ResolvedExtendedFieldFilter): estypes.QueryDslQueryContainer | null => {
  const fieldName = `ef_${storageKey}`;

  let valueClause: estypes.QueryDslQueryContainer;
  if (control === DATE_PICKER) {
    const range = parseDateFilterToRange(value);
    if (range == null) return null;
    valueClause = { range: { [fieldName]: range } };
  } else {
    const runtimeType = mapToRuntimeType(esType);
    const typedValue = runtimeType === 'long' || runtimeType === 'double' ? Number(value) : value;
    valueClause = { term: { [fieldName]: { value: typedValue } } };
  }

  const templateFilter: estypes.QueryDslQueryContainer = {
    terms: { 'cases.template.id': templateIds },
  };

  return { bool: { filter: [valueClause, templateFilter] } };
};

export const buildExtendedFieldFilterClauses = (
  resolvedFilterGroups: ResolvedExtendedFieldFilter[][]
): estypes.QueryDslQueryContainer[] =>
  resolvedFilterGroups.flatMap((group): estypes.QueryDslQueryContainer[] => {
    const clauses = group.flatMap((filter) => {
      const clause = buildSingleFilterClause(filter);
      return clause != null ? [clause] : [];
    });

    if (clauses.length === 0) return [];

    // Multiple entries in the same group mean the same label resolves to different storage keys
    // across templates — OR them so any matching template's case is returned.
    if (clauses.length === 1) return clauses;

    return [{ bool: { should: clauses, minimum_should_match: 1 } }];
  });
